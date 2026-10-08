import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { stripeConnectAdapter, verifyStripeWebhookSignature } from "../../lib/server/payments/stripe";
import type { ProviderCheckoutInput, ResolvedPaymentCredentials } from "../../lib/server/payments/types";

const input: ProviderCheckoutInput = {
  storeId: "store-a",
  providerAccountId: "provider-account-a",
  transactionId: "payment-transaction-a",
  checkoutAttempt: 1,
  orderId: "order-a",
  orderNumber: "A-1001",
  amountMinor: 1299n,
  currency: "AED",
  storeOrigin: "https://store-a.example.test",
  publicConfig: { accountId: "acct_12345678" },
};

const credentials: ResolvedPaymentCredentials = {
  secretRef: "vault:store-a/stripe/live",
  provider: "stripe_connect",
  storeId: "store-a",
  providerAccountId: "provider-account-a",
  mode: "LIVE",
  connectedAccountId: "acct_12345678",
  secrets: { apiSecretKey: "sk_live_fake", webhookSigningSecret: "whsec_fake" },
};

function signedHeader(body: string, secret: string, timestamp = Math.floor(Date.now() / 1000)) {
  const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

test("Stripe webhook signatures accept current valid signatures and reject invalid/stale signatures", () => {
  const body = '{"id":"evt_test","type":"checkout.session.completed"}';
  const signature = signedHeader(body, "whsec_fake");
  assert.equal(verifyStripeWebhookSignature(body, signature, "whsec_fake"), true);
  assert.equal(verifyStripeWebhookSignature(body, signature, "whsec_wrong"), false);
  assert.equal(verifyStripeWebhookSignature(body, "t=123,v1=invalid", "whsec_fake"), false);
  assert.equal(
    verifyStripeWebhookSignature(body, signedHeader(body, "whsec_fake", 1), "whsec_fake"),
    false,
  );
});

test("Stripe Checkout uses the configured LIVE key, connected account and stable attempt idempotency key", async (t) => {
  const originalFetch = globalThis.fetch;
  let captured: { url: string; init?: RequestInit } | null = null;
  globalThis.fetch = (async (inputUrl: URL | RequestInfo, init?: RequestInit) => {
    captured = { url: String(inputUrl), init };
    return Response.json({
      id: "cs_live_123",
      url: "https://checkout.stripe.com/c/pay/cs_live_123",
      client_reference_id: input.transactionId,
      payment_status: "unpaid",
      amount_total: 1299,
      currency: "aed",
      metadata: {},
    });
  }) as typeof fetch;
  t.after(() => { globalThis.fetch = originalFetch; });

  const session = await stripeConnectAdapter.createCheckout(input, credentials);
  assert.equal(session.providerReference, "cs_live_123");
  assert.deepEqual(session.redirect, { kind: "redirect", url: "https://checkout.stripe.com/c/pay/cs_live_123" });
  assert.equal(JSON.stringify(session).includes(credentials.secrets.apiSecretKey), false);
  assert.equal(JSON.stringify(session).includes(credentials.secrets.webhookSigningSecret), false);
  assert.ok(captured);
  const request = captured as { url: string; init?: RequestInit };
  const headers = new Headers(request.init?.headers);
  assert.equal(request.url, "https://api.stripe.com/v1/checkout/sessions");
  assert.equal(headers.get("Stripe-Account"), "acct_12345678");
  assert.equal(headers.get("Idempotency-Key"), "payment-transaction-a:checkout:1");
  assert.equal(new URLSearchParams(String(request.init?.body)).get("metadata[store_id]"), "store-a");
  assert.equal(new URLSearchParams(String(request.init?.body)).get("metadata[order_id]"), "order-a");

  await assert.rejects(
    () => stripeConnectAdapter.createCheckout(input, { ...credentials, secrets: { ...credentials.secrets, apiSecretKey: "sk_test_fake" } }),
    /credentials are unavailable/,
  );
  await assert.rejects(
    () => stripeConnectAdapter.createCheckout(input, { ...credentials, connectedAccountId: "acct_other" }),
    /do not match/,
  );
});

test("Stripe webhook verification requires the matching Connect account and binds the session metadata", async (t) => {
  const originalFetch = globalThis.fetch;
  const body = JSON.stringify({
    id: "evt_live_1",
    type: "checkout.session.completed",
    account: "acct_12345678",
    data: {
      object: {
        id: "cs_live_123",
        url: null,
        client_reference_id: input.transactionId,
        payment_status: "paid",
        amount_total: 1299,
        currency: "aed",
        metadata: {
          store_id: input.storeId,
          order_id: input.orderId,
          payment_transaction_id: input.transactionId,
        },
      },
    },
  });

  globalThis.fetch = (async () => new Response(null, { status: 500 })) as typeof fetch;
  t.after(() => { globalThis.fetch = originalFetch; });

  const headers = new Headers({ "stripe-signature": signedHeader(body, "whsec_fake") });
  const event = await stripeConnectAdapter.verifyWebhook?.(body, headers, credentials, "acct_12345678");
  assert.equal(event?.paymentTransactionId, input.transactionId);
  assert.equal(event?.storeId, input.storeId);
  assert.equal(event?.orderId, input.orderId);
  assert.equal(event?.amountMinor, input.amountMinor);
  assert.equal(await stripeConnectAdapter.verifyWebhook?.(body, headers, credentials, "acct_other"), null);
  assert.equal(
    await stripeConnectAdapter.verifyWebhook?.(body, new Headers(), credentials, "acct_12345678"),
    null,
  );
});

test("manual refund evidence must match a successful refund on the original Checkout payment", async (t) => {
  const originalFetch = globalThis.fetch;
  const calls: { url: string; init?: RequestInit }[] = [];
  globalThis.fetch = (async (inputUrl: URL | RequestInfo, init?: RequestInit) => {
    const url = String(inputUrl);
    calls.push({ url, init });
    if (url.includes("/checkout/sessions/")) {
      return Response.json({
        id: "cs_live_123",
        url: null,
        client_reference_id: input.transactionId,
        payment_status: "paid",
        amount_total: 1299,
        currency: "aed",
        payment_intent: "pi_live_123",
        metadata: {
          payment_transaction_id: input.transactionId,
          store_id: input.storeId,
          order_id: input.orderId,
        },
      });
    }
    return Response.json({
      id: "re_live_123",
      amount: 500,
      currency: "aed",
      status: "succeeded",
      payment_intent: "pi_live_123",
    });
  }) as typeof fetch;
  t.after(() => { globalThis.fetch = originalFetch; });

  const evidence = await stripeConnectAdapter.verifyRefund?.(input, "cs_live_123", "re_live_123", credentials);
  assert.deepEqual(evidence, { providerRefundId: "re_live_123", amountMinor: 500n, currency: "AED" });
  assert.equal(calls.length, 2);
  assert.equal(new Headers(calls[0].init?.headers).get("Stripe-Account"), "acct_12345678");
  assert.equal(new Headers(calls[1].init?.headers).get("Stripe-Account"), "acct_12345678");
});
