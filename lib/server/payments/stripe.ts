import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  PaymentProviderAdapter,
  ProviderCheckoutInput,
  ProviderCheckoutSession,
  ResolvedPaymentCredentials,
  VerifiedPaymentEvent,
} from "./types";

const STRIPE_API = "https://api.stripe.com/v1";
const SIGNATURE_TOLERANCE_SECONDS = 300;

class StripeResourceNotFound extends Error {}

function credentialsForStripe(credentials: ResolvedPaymentCredentials, mode: "TEST" | "LIVE") {
  const apiKey = credentials.secrets.apiSecretKey;
  const webhookSecret = credentials.secrets.webhookSigningSecret;
  const keyPrefix = mode === "LIVE" ? "sk_live_" : "sk_test_";
  if (!apiKey?.startsWith(keyPrefix) || !webhookSecret?.startsWith("whsec_")) {
    throw new Error(`Stripe ${mode.toLowerCase()} credentials are unavailable.`);
  }
  return { apiKey, webhookSecret };
}

function stripeAccountId(input: ProviderCheckoutInput, credentials: ResolvedPaymentCredentials) {
  const accountId = input.publicConfig.accountId;
  if (typeof accountId !== "string" || !/^acct_[A-Za-z0-9]+$/.test(accountId)) {
    throw new Error("Stripe connected account is not configured.");
  }
  if (!input.providerAccountId) throw new Error("Stripe account context is unavailable.");
  if (credentials.connectedAccountId !== accountId) throw new Error("Stripe connected account credentials do not match.");
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
  if (response.status === 404) throw new StripeResourceNotFound();
  const body = (await response.json().catch(() => null)) as { error?: { type?: string }; [key: string]: unknown } | null;
  if (!response.ok || !body) {
    throw new Error("Stripe could not process this payment request.");
  }
  return body as T;
}

interface StripeSession {
  id: string;
  url: string | null;
  status?: "open" | "complete" | "expired";
  expires_at?: number;
  client_reference_id: string | null;
  payment_status: string;
  amount_total: number | null;
  currency: string;
  payment_intent?: string | null;
  metadata: Record<string, string>;
}

interface StripeRefund {
  id: string;
  amount: number;
  currency: string;
  status: string | null;
  payment_intent: string | null;
}

interface StripeEvent {
  id: string;
  type: string;
  account?: string;
  livemode?: boolean;
  data?: { object?: StripeSession };
}

function paymentEvent(
  event: StripeEvent,
  session: StripeSession,
  input?: ProviderCheckoutInput,
): VerifiedPaymentEvent | null {
  const transactionId = session.client_reference_id;
  const storeId = session.metadata?.store_id;
  const orderId = session.metadata?.order_id;
  if (!event.id || !event.type || !transactionId || session.metadata?.payment_transaction_id !== transactionId || !storeId || !orderId) return null;
  if (input && (transactionId !== input.transactionId || storeId !== input.storeId || orderId !== input.orderId)) return null;
  if (!Number.isSafeInteger(session.amount_total) || session.amount_total === null || session.amount_total < 0) return null;
  if (input && (BigInt(session.amount_total) !== input.amountMinor || session.currency.toUpperCase() !== input.currency)) return null;
  return {
    eventId: event.id,
    eventType: event.type,
    paymentTransactionId: transactionId,
    storeId,
    orderId,
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

function stripeSessionIdPrefix(mode: "TEST" | "LIVE") {
  return mode === "LIVE" ? "cs_live_" : "cs_test_";
}

function checkoutRedirect(session: StripeSession): ProviderCheckoutSession | null {
  return session.url && session.id
    ? { providerReference: session.id, redirect: { kind: "redirect", url: session.url } }
    : null;
}

export const stripeConnectAdapter: PaymentProviderAdapter = {
  id: "stripe_connect",
  method: "stripe_checkout",
  async createCheckout(input, credentials) {
    const mode = credentials.mode ?? "TEST";
    const { apiKey } = credentialsForStripe(credentials, mode);
    const accountId = stripeAccountId(input, credentials);
    const expiresAt = Math.floor(Date.now() / 1000) + 30 * 60;
    const form = new URLSearchParams({
      mode: "payment",
      expires_at: String(expiresAt),
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
      {
        method: "POST",
        body: form,
        headers: { "Idempotency-Key": `${input.transactionId}:checkout:${input.checkoutAttempt}` },
      },
    );
    const result = checkoutRedirect(session);
    if (!result) throw new Error("Stripe did not return a hosted checkout session.");
    return result;
  },
  async verifyReturn(input, query, credentials) {
    const sessionId = query.get("session_id");
    const mode = credentials.mode ?? "TEST";
    if (!sessionId || !sessionId.startsWith(stripeSessionIdPrefix(mode)) || !/^cs_(?:test|live)_[A-Za-z0-9_]+$/.test(sessionId)) return null;
    const { apiKey } = credentialsForStripe(credentials, mode);
    const accountId = stripeAccountId(input, credentials);
    const session = await stripeRequest<StripeSession>(
      `/checkout/sessions/${encodeURIComponent(sessionId)}`,
      apiKey,
      accountId,
    );
    const event: StripeEvent = { id: `return:${session.id}`, type: "checkout.session.return_verified" };
    return paymentEvent(event, session, input);
  },
  async recoverCheckout(input, providerReference, credentials) {
    const mode = credentials.mode ?? "TEST";
    if (!providerReference.startsWith(stripeSessionIdPrefix(mode))) return null;
    const { apiKey } = credentialsForStripe(credentials, mode);
    const accountId = stripeAccountId(input, credentials);
    let session: StripeSession;
    try {
      session = await stripeRequest<StripeSession>(
        `/checkout/sessions/${encodeURIComponent(providerReference)}`,
        apiKey,
        accountId,
      );
    } catch (error) {
      if (error instanceof StripeResourceNotFound) return "missing";
      throw error;
    }
    if (
      session.id !== providerReference ||
      !paymentEvent({ id: `recovery:${session.id}`, type: "checkout.session.recovered" }, session, input) ||
      !session.status
    ) return null;
    if (session.status === "expired") return "expired";
    if (session.status === "complete") return "complete";
    if (session.status !== "open") return null;
    return checkoutRedirect(session);
  },
  async verifyRefund(input, providerReference, refundId, credentials) {
    if (!/^re_[A-Za-z0-9_]+$/.test(refundId)) return null;
    const mode = credentials.mode ?? "TEST";
    if (!providerReference.startsWith(stripeSessionIdPrefix(mode))) return null;
    const { apiKey } = credentialsForStripe(credentials, mode);
    const accountId = stripeAccountId(input, credentials);
    const session = await stripeRequest<StripeSession>(
      `/checkout/sessions/${encodeURIComponent(providerReference)}`,
      apiKey,
      accountId,
    );
    if (
      session.id !== providerReference ||
      !paymentEvent({ id: `refund-check:${session.id}`, type: "checkout.session.refund_check" }, session, input) ||
      session.payment_status !== "paid" ||
      !session.payment_intent
    ) return null;
    const refund = await stripeRequest<StripeRefund>(
      `/refunds/${encodeURIComponent(refundId)}`,
      apiKey,
      accountId,
    );
    if (
      refund.id !== refundId ||
      refund.status !== "succeeded" ||
      refund.payment_intent !== session.payment_intent ||
      !Number.isSafeInteger(refund.amount) ||
      refund.amount <= 0 ||
      refund.currency.toUpperCase() !== input.currency
    ) return null;
    return { providerRefundId: refund.id, amountMinor: BigInt(refund.amount), currency: refund.currency.toUpperCase() };
  },
  async verifyWebhook(rawBody, headers, credentials, accountId) {
    const mode = credentials.mode ?? "TEST";
    const { webhookSecret } = credentialsForStripe(credentials, mode);
    if (!verifyStripeWebhookSignature(rawBody, headers.get("stripe-signature"), webhookSecret)) return null;
    let event: StripeEvent;
    try {
      event = JSON.parse(rawBody) as StripeEvent;
    } catch {
      return null;
    }
    if (event.account !== accountId || event.livemode !== (mode === "LIVE") || !event.data?.object) return null;
    const supported = new Set([
      "checkout.session.completed",
      "checkout.session.async_payment_succeeded",
      "checkout.session.async_payment_failed",
    ]);
    if (!supported.has(event.type)) return null;
    return paymentEvent(event, event.data.object);
  },
};
