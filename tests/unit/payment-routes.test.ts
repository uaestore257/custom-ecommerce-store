import assert from "node:assert/strict";
import { test } from "node:test";
import {
  forwardStripeWebhookRequest,
  paymentReturnQuery,
  paymentReturnResponse,
} from "../../lib/server/payments/http";

test("Stripe webhook forwarding preserves the raw request body and provider account scope", async () => {
  const rawBody = '{ "id" : "evt_test", "data": { "amount": 100 } }\n';
  const request = new Request("https://shop.example.test/api/webhooks/stripe/account-a", {
    method: "POST",
    headers: { "stripe-signature": "t=1,v1=test", "content-type": "application/json" },
    body: rawBody,
  });
  let captured: { providerAccountId: string; rawBody: string; signature: string | null } | undefined;

  const response = await forwardStripeWebhookRequest(request, "account-a", async (providerAccountId, body, headers) => {
    captured = { providerAccountId, rawBody: body, signature: headers.get("stripe-signature") };
    return "accepted";
  });

  assert.deepEqual(captured, {
    providerAccountId: "account-a",
    rawBody,
    signature: "t=1,v1=test",
  });
  assert.equal(response.status, 200);
});

test("Stripe webhook duplicates are acknowledged and invalid signatures are rejected", async () => {
  const duplicate = await forwardStripeWebhookRequest(
    new Request("https://shop.example.test/webhook", { method: "POST", body: "payload" }),
    "account-a",
    async () => "duplicate",
  );
  const invalid = await forwardStripeWebhookRequest(
    new Request("https://shop.example.test/webhook", { method: "POST", body: "payload" }),
    "account-a",
    async () => "invalid",
  );

  assert.equal(duplicate.status, 200);
  assert.equal(invalid.status, 400);
});

test("provider return responses are uncached and distinguish payment outcomes", async () => {
  const paid = paymentReturnResponse("paid");
  const cancelled = paymentReturnResponse("cancelled");
  const pending = paymentReturnResponse("pending");

  assert.match(await paid.text(), /Payment received/);
  assert.match(await cancelled.text(), /Checkout cancelled/);
  assert.match(await pending.text(), /awaiting confirmation/);
  assert.equal(paid.headers.get("cache-control"), "no-store, max-age=0");
});

test("provider returns accept query and URL-encoded form fields, but reject other request types", async () => {
  const get = await paymentReturnQuery(new Request("https://shop.example.test/payment/return/txn-a?session_id=cs_test_a"));
  const post = await paymentReturnQuery(
    new Request("https://shop.example.test/payment/return/txn-a", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "pp_TxnRefNo=txn-a&pp_ResponseCode=000",
    }),
  );
  const unsupported = await paymentReturnQuery(
    new Request("https://shop.example.test/payment/return/txn-a", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pp_ResponseCode: "000" }),
    }),
  );

  assert.equal(get?.get("session_id"), "cs_test_a");
  assert.equal(post?.get("pp_TxnRefNo"), "txn-a");
  assert.equal(post?.get("pp_ResponseCode"), "000");
  assert.equal(unsupported, null);
});
