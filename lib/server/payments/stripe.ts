import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  PaymentProviderAdapter,
  ProviderCheckoutInput,
  ResolvedPaymentCredentials,
  VerifiedPaymentEvent,
} from "./types";

const STRIPE_API = "https://api.stripe.com/v1";
const SIGNATURE_TOLERANCE_SECONDS = 300;

function credentialsForStripe(credentials: ResolvedPaymentCredentials) {
  const apiKey = credentials.secrets.apiSecretKey;
  const webhookSecret = credentials.secrets.webhookSigningSecret;
  if (!apiKey?.startsWith("sk_test_") || !webhookSecret?.startsWith("whsec_")) {
    throw new Error("Stripe test credentials are unavailable.");
  }
  return { apiKey, webhookSecret };
}

function stripeAccountId(input: ProviderCheckoutInput) {
  const accountId = input.publicConfig.accountId;
  if (typeof accountId !== "string" || !/^acct_[A-Za-z0-9]+$/.test(accountId)) {
    throw new Error("Stripe connected account is not configured.");
  }
  if (!input.providerAccountId) throw new Error("Stripe account context is unavailable.");
  return accountId;
}

async function stripeRequest<T>(
  path: string,
  apiKey: string,
  accountId: string,
  init: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${STRIPE_API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Stripe-Account": accountId,
        ...(init.body instanceof URLSearchParams ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
        ...init.headers,
      },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new Error("Stripe is temporarily unavailable.");
  }
  const body = (await response.json().catch(() => null)) as { error?: { type?: string }; [key: string]: unknown } | null;
  if (!response.ok || !body) {
    throw new Error("Stripe could not process this payment request.");
  }
  return body as T;
}

interface StripeSession {
  id: string;
  url: string | null;
  client_reference_id: string | null;
  payment_status: string;
  amount_total: number | null;
  currency: string;
  metadata: Record<string, string>;
}

interface StripeEvent {
  id: string;
  type: string;
  account?: string;
  data?: { object?: StripeSession };
}

function paymentEvent(
  event: StripeEvent,
  session: StripeSession,
  transactionId: string,
): VerifiedPaymentEvent | null {
  if (!event.id || !event.type || session.client_reference_id !== transactionId) return null;
  if (session.metadata?.payment_transaction_id !== transactionId) return null;
  if (!Number.isSafeInteger(session.amount_total) || session.amount_total === null || session.amount_total < 0) return null;
  return {
    eventId: event.id,
    eventType: event.type,
    paymentTransactionId: transactionId,
    transactionReference: session.id,
    amountMinor: BigInt(session.amount_total),
    currency: session.currency.toUpperCase(),
    outcome:
      session.payment_status === "paid"
        ? "SUCCEEDED"
        : event.type === "checkout.session.async_payment_failed"
          ? "FAILED"
          : "PENDING",
  };
}

export function verifyStripeWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  webhookSecret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  if (!signatureHeader || !webhookSecret.startsWith("whsec_")) return false;
  const parts = signatureHeader.split(",").map((part) => part.split("=", 2));
  const timestampText = parts.find(([key]) => key === "t")?.[1];
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value);
  const timestamp = Number(timestampText);
  if (!Number.isSafeInteger(timestamp) || Math.abs(nowSeconds - timestamp) > SIGNATURE_TOLERANCE_SECONDS) return false;
  const expected = createHmac("sha256", webhookSecret).update(`${timestamp}.${rawBody}`).digest();
  return signatures.some((signature) => {
    if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
    const candidate = Buffer.from(signature, "hex");
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  });
}

export const stripeConnectAdapter: PaymentProviderAdapter = {
  id: "stripe_connect",
  method: "stripe_checkout",
  async createCheckout(input, credentials) {
    const { apiKey } = credentialsForStripe(credentials);
    const accountId = stripeAccountId(input);
    const form = new URLSearchParams({
      mode: "payment",
      success_url: `${input.storeOrigin}/payment/return/${encodeURIComponent(input.transactionId)}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${input.storeOrigin}/payment/return/${encodeURIComponent(input.transactionId)}?cancelled=1`,
      client_reference_id: input.transactionId,
      "line_items[0][price_data][currency]": input.currency.toLowerCase(),
      "line_items[0][price_data][unit_amount]": input.amountMinor.toString(),
      "line_items[0][price_data][product_data][name]": `Order ${input.orderNumber}`,
      "line_items[0][quantity]": "1",
      "metadata[store_id]": input.storeId,
      "metadata[order_id]": input.orderId,
      "metadata[payment_transaction_id]": input.transactionId,
    });
    const session = await stripeRequest<StripeSession>(
      "/checkout/sessions",
      apiKey,
      accountId,
      { method: "POST", body: form, headers: { "Idempotency-Key": input.transactionId } },
    );
    if (!session.url || !session.id) throw new Error("Stripe did not return a hosted checkout session.");
    return { providerReference: session.id, redirect: { kind: "redirect", url: session.url } };
  },
  async verifyReturn(input, query, credentials) {
    const sessionId = query.get("session_id");
    if (!sessionId || !/^cs_test_[A-Za-z0-9_]+$/.test(sessionId)) return null;
    const { apiKey } = credentialsForStripe(credentials);
    const accountId = stripeAccountId(input);
    const session = await stripeRequest<StripeSession>(
      `/checkout/sessions/${encodeURIComponent(sessionId)}`,
      apiKey,
      accountId,
    );
    const event: StripeEvent = { id: `return:${session.id}`, type: "checkout.session.return_verified" };
    return paymentEvent(event, session, input.transactionId);
  },
  async verifyWebhook(rawBody, headers, credentials, accountId) {
    const { webhookSecret } = credentialsForStripe(credentials);
    if (!verifyStripeWebhookSignature(rawBody, headers.get("stripe-signature"), webhookSecret)) return null;
    let event: StripeEvent;
    try {
      event = JSON.parse(rawBody) as StripeEvent;
    } catch {
      return null;
    }
    if (event.account !== accountId || !event.data?.object) return null;
    const supported = new Set([
      "checkout.session.completed",
      "checkout.session.async_payment_succeeded",
      "checkout.session.async_payment_failed",
    ]);
    if (!supported.has(event.type)) return null;
    const transactionId = event.data.object.metadata?.payment_transaction_id;
    if (!transactionId) return null;
    return paymentEvent(event, event.data.object, transactionId);
  },
};
