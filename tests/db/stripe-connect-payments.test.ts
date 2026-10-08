import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { createAdminCategory } from "../../lib/server/admin/categories";
import { getAdminOrder } from "../../lib/server/admin/orders";
import { createAdminStore, updateStoreOwnerSettings } from "../../lib/server/admin/stores";
import { createAdminProduct } from "../../lib/server/admin/products";
import { placeOrder } from "../../lib/server/orders";
import { createProviderCheckout, handleStripeWebhook, recordManualStripeRefund } from "../../lib/server/payments/service";
import type { PaymentCredentialResolver } from "../../lib/server/payments/types";
import { testActor, testDb, uid } from "./helpers";

const db = testDb();
after(() => db.$disconnect());

const accountId = "acct_12345678";
const webhookSecret = "whsec_test_fake";
const resolver: PaymentCredentialResolver = {
  async isAvailable() {
    return true;
  },
  async resolve(context) {
    return {
      ...context,
      secrets: { apiSecretKey: "sk_test_fake", webhookSigningSecret: webhookSecret },
    };
  },
};

async function createPayment(orderStatus: "PENDING" | "CANCELLED" = "PENDING", transactionStatus: "PENDING" | "CANCELLED" = "PENDING") {
  const owner = await testActor(db);
  const created = await createAdminStore(owner, db, {
    name: `Stripe payment ${uid()}`,
    slug: `stripe-payment-${uid()}`,
    businessType: "retail",
    status: "ACTIVE",
    ownerName: "Stripe Test Owner",
    ownerEmail: `stripe-${uid()}@example.com`,
    ownerPassword: "a stripe payment test passphrase 2026",
    countryCode: "AE",
    baseCurrency: "AED",
    timezone: "Asia/Dubai",
    defaultLanguage: "en",
    languages: ["en"],
    accentColor: "#123456",
  });
  assert.ok(created.ok, JSON.stringify(created));
  const storeId = created.data.id;
  const providerAccount = await db.paymentProviderAccount.create({
    data: {
      storeId,
      provider: "stripe_connect",
      displayName: "Stripe test",
      mode: "TEST",
      enabled: true,
      publicConfig: { accountId },
      secretRef: `vault:${storeId}/stripe/test`,
    },
  });
  const order = await db.order.create({
    data: {
      storeId,
      number: 1001,
      status: orderStatus,
      paymentMethod: "stripe_checkout",
      paymentStatus: "UNPAID",
      currency: "AED",
      locale: "en",
      pricesIncludeTax: false,
      subtotalMinor: 1299n,
      shippingMinor: 0n,
      taxMinor: 0n,
      discountMinor: 0n,
      totalMinor: 1299n,
      customerName: "Stripe Test Customer",
      customerEmail: `customer-${uid()}@example.com`,
      shippingAddress: { fulfillmentMethod: "PICKUP" },
      idempotencyKey: uid(),
      requestFingerprint: "a".repeat(64),
    },
  });
  const transaction = await db.paymentTransaction.create({
    data: {
      storeId,
      orderId: order.id,
      providerAccountId: providerAccount.id,
      currency: order.currency,
      method: "stripe_checkout",
      amountMinor: order.totalMinor,
      status: transactionStatus,
      idempotencyKey: uid(),
      providerReference: "cs_test_stored",
      checkoutAttempt: 1,
      checkoutAttemptStartedAt: new Date(),
    },
  });
  return { storeId, providerAccount, order, transaction, actorUserId: owner.userId };
}

function signedEvent(
  data: {
    transactionId: string;
    storeId: string;
    orderId: string;
    amount: number;
    currency?: string;
    sessionId?: string;
    account?: string;
  },
) {
  const body = JSON.stringify({
    id: `evt_${randomUUID().replaceAll("-", "")}`,
    type: "checkout.session.completed",
    account: data.account ?? accountId,
    data: {
      object: {
        id: data.sessionId ?? "cs_test_stored",
        url: null,
        client_reference_id: data.transactionId,
        payment_status: "paid",
        amount_total: data.amount,
        currency: data.currency ?? "aed",
        metadata: {
          payment_transaction_id: data.transactionId,
          store_id: data.storeId,
          order_id: data.orderId,
        },
      },
    },
  });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", webhookSecret).update(`${timestamp}.${body}`).digest("hex");
  return { body, headers: new Headers({ "stripe-signature": `t=${timestamp},v1=${signature}` }) };
}

test("verified Stripe webhook settles once and replay is idempotent", async () => {
  const payment = await createPayment();
  const event = signedEvent({
    transactionId: payment.transaction.id,
    storeId: payment.storeId,
    orderId: payment.order.id,
    amount: 1299,
  });
  assert.equal(await handleStripeWebhook(db, payment.providerAccount.id, event.body, event.headers, resolver), "accepted");
  assert.equal(await handleStripeWebhook(db, payment.providerAccount.id, event.body, event.headers, resolver), "duplicate");
  const [order, transaction] = await Promise.all([
    db.order.findUniqueOrThrow({ where: { id: payment.order.id } }),
    db.paymentTransaction.findUniqueOrThrow({ where: { id: payment.transaction.id } }),
  ]);
  assert.equal(order.paymentStatus, "PAID");
  assert.equal(transaction.status, "SUCCEEDED");
});

test("Stripe webhooks reject wrong amount, currency, session and connected account without mutation", async () => {
  const payment = await createPayment();
  const mismatchCases = [
    { amount: 1300 },
    { amount: 1299, currency: "usd" },
    { amount: 1299, sessionId: "cs_test_other" },
    { amount: 1299, account: "acct_other" },
    { amount: 1299, storeId: "store_other" },
    { amount: 1299, orderId: "order_other" },
  ];
  for (const mismatch of mismatchCases) {
    const event = signedEvent({
      transactionId: payment.transaction.id,
      storeId: payment.storeId,
      orderId: payment.order.id,
      ...mismatch,
    });
    assert.equal(await handleStripeWebhook(db, payment.providerAccount.id, event.body, event.headers, resolver), "invalid");
  }
  await db.order.update({ where: { id: payment.order.id }, data: { totalMinor: 1300n } });
  const orderAmountMismatch = signedEvent({
    transactionId: payment.transaction.id,
    storeId: payment.storeId,
    orderId: payment.order.id,
    amount: 1299,
  });
  assert.equal(
    await handleStripeWebhook(db, payment.providerAccount.id, orderAmountMismatch.body, orderAmountMismatch.headers, resolver),
    "invalid",
  );
  await db.order.update({ where: { id: payment.order.id }, data: { totalMinor: 1299n } });
  const order = await db.order.findUniqueOrThrow({ where: { id: payment.order.id } });
  const transaction = await db.paymentTransaction.findUniqueOrThrow({ where: { id: payment.transaction.id } });
  assert.equal(order.paymentStatus, "UNPAID");
  assert.equal(transaction.status, "PENDING");
});

test("late successful Stripe payment for a cancelled order enters reconciliation without reopening it", async () => {
  const payment = await createPayment("CANCELLED", "CANCELLED");
  const event = signedEvent({
    transactionId: payment.transaction.id,
    storeId: payment.storeId,
    orderId: payment.order.id,
    amount: 1299,
  });
  assert.equal(await handleStripeWebhook(db, payment.providerAccount.id, event.body, event.headers, resolver), "accepted");
  const [order, transaction] = await Promise.all([
    db.order.findUniqueOrThrow({ where: { id: payment.order.id } }),
    db.paymentTransaction.findUniqueOrThrow({ where: { id: payment.transaction.id } }),
  ]);
  assert.equal(order.status, "CANCELLED");
  assert.equal(order.paymentStatus, "UNPAID");
  assert.equal(transaction.status, "RECONCILIATION");
  assert.equal(transaction.failureCode, "late_success_cancelled_order");
});

async function expireStripeAttempt(
  payment: Awaited<ReturnType<typeof createPayment>>,
  providerReference: string | null = null,
) {
  await db.storePaymentMethod.upsert({
    where: { storeId_method: { storeId: payment.storeId, method: "stripe_checkout" } },
    create: {
      storeId: payment.storeId,
      method: "stripe_checkout",
      enabled: true,
      providerAccountId: payment.providerAccount.id,
    },
    update: { enabled: true, providerAccountId: payment.providerAccount.id },
  });
  await db.paymentTransaction.update({
    where: { id: payment.transaction.id },
    data: {
      providerReference,
      checkoutAttempt: 1,
      checkoutAttemptStartedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
  });
}

test("an expired Stripe attempt without a stored session enters audited reconciliation and a verified webhook settles it", async () => {
  const payment = await createPayment();
  await expireStripeAttempt(payment);
  const previousFetch = globalThis.fetch;
  let fetchCount = 0;
  globalThis.fetch = (async () => {
    fetchCount += 1;
    throw new Error("Stripe must not receive an expired idempotency attempt");
  }) as typeof fetch;
  try {
    assert.equal(await createProviderCheckout(db, payment.storeId, payment.transaction.id, resolver), null);
    assert.equal(fetchCount, 0);
    const [transaction, order, audit, adminOrder] = await Promise.all([
      db.paymentTransaction.findUniqueOrThrow({ where: { id: payment.transaction.id } }),
      db.order.findUniqueOrThrow({ where: { id: payment.order.id } }),
      db.auditEvent.findFirst({
        where: {
          action: "payment.stripe_checkout_reconciliation",
          targetId: payment.transaction.id,
        },
      }),
      getAdminOrder(db, payment.storeId, payment.order.id),
    ]);
    assert.equal(transaction.status, "RECONCILIATION");
    assert.equal(transaction.failureCode, "checkout_attempt_expired_unrecoverable_session");
    assert.equal(transaction.providerReference, null);
    assert.equal(order.status, "PENDING");
    assert.equal(order.paymentStatus, "UNPAID");
    assert.ok(audit);
    assert.equal(adminOrder?.paymentTransactionFailureCode, "checkout_attempt_expired_unrecoverable_session");
    assert.equal(adminOrder?.stripeRefundRecordAvailable, false);

    const event = signedEvent({
      transactionId: payment.transaction.id,
      storeId: payment.storeId,
      orderId: payment.order.id,
      amount: 1299,
    });
    assert.equal(await handleStripeWebhook(db, payment.providerAccount.id, event.body, event.headers, resolver), "accepted");
    const [settledOrder, settledTransaction] = await Promise.all([
      db.order.findUniqueOrThrow({ where: { id: payment.order.id } }),
      db.paymentTransaction.findUniqueOrThrow({ where: { id: payment.transaction.id } }),
    ]);
    assert.equal(settledOrder.status, "PENDING");
    assert.equal(settledOrder.paymentStatus, "PAID");
    assert.equal(settledTransaction.status, "SUCCEEDED");
    assert.equal(settledTransaction.providerReference, "cs_test_stored");
    assert.equal(settledTransaction.failureCode, null);
    assert.equal(await db.order.count({ where: { storeId: payment.storeId } }), 1);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("an expired Stripe attempt with a disabled payment method enters audited reconciliation without creating a new attempt", async () => {
  const payment = await createPayment();
  await expireStripeAttempt(payment);
  await db.storePaymentMethod.update({
    where: { storeId_method: { storeId: payment.storeId, method: "stripe_checkout" } },
    data: { enabled: false },
  });

  const previousFetch = globalThis.fetch;
  let fetchCount = 0;
  globalThis.fetch = (async () => {
    fetchCount += 1;
    throw new Error("Stripe must not receive an expired idempotency attempt");
  }) as typeof fetch;
  try {
    assert.equal(await createProviderCheckout(db, payment.storeId, payment.transaction.id, resolver), null);
    assert.equal(fetchCount, 0);
    const [transaction, order, audit] = await Promise.all([
      db.paymentTransaction.findUniqueOrThrow({ where: { id: payment.transaction.id } }),
      db.order.findUniqueOrThrow({ where: { id: payment.order.id } }),
      db.auditEvent.findFirst({
        where: {
          action: "payment.stripe_checkout_reconciliation",
          targetId: payment.transaction.id,
        },
      }),
    ]);
    assert.equal(transaction.status, "RECONCILIATION");
    assert.equal(transaction.failureCode, "checkout_attempt_expired_unrecoverable_session");
    assert.equal(transaction.providerReference, null);
    assert.equal(transaction.checkoutAttempt, 1);
    assert.equal(order.status, "PENDING");
    assert.equal(order.paymentStatus, "UNPAID");
    assert.ok(audit);
    assert.equal(await db.order.count({ where: { storeId: payment.storeId } }), 1);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("an expired LIVE Stripe attempt enters audited reconciliation while LIVE checkout is gated off", async () => {
  const payment = await createPayment();
  await expireStripeAttempt(payment);
  await db.paymentProviderAccount.update({
    where: { id: payment.providerAccount.id },
    data: { mode: "LIVE" },
  });
  const previousLiveGate = process.env.STRIPE_LIVE_CHECKOUT_ENABLED;
  delete process.env.STRIPE_LIVE_CHECKOUT_ENABLED;
  const previousFetch = globalThis.fetch;
  let fetchCount = 0;
  globalThis.fetch = (async () => {
    fetchCount += 1;
    throw new Error("Stripe must not receive an expired idempotency attempt");
  }) as typeof fetch;
  try {
    assert.equal(await createProviderCheckout(db, payment.storeId, payment.transaction.id, resolver), null);
    assert.equal(fetchCount, 0);
    const [transaction, order, audit] = await Promise.all([
      db.paymentTransaction.findUniqueOrThrow({ where: { id: payment.transaction.id } }),
      db.order.findUniqueOrThrow({ where: { id: payment.order.id } }),
      db.auditEvent.findFirst({
        where: {
          action: "payment.stripe_checkout_reconciliation",
          targetId: payment.transaction.id,
        },
      }),
    ]);
    assert.equal(transaction.status, "RECONCILIATION");
    assert.equal(transaction.failureCode, "checkout_attempt_expired_unrecoverable_session");
    assert.equal(transaction.providerReference, null);
    assert.equal(transaction.checkoutAttempt, 1);
    assert.equal(order.status, "PENDING");
    assert.equal(order.paymentStatus, "UNPAID");
    assert.ok(audit);
    assert.equal(await db.order.count({ where: { storeId: payment.storeId } }), 1);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousLiveGate === undefined) delete process.env.STRIPE_LIVE_CHECKOUT_ENABLED;
    else process.env.STRIPE_LIVE_CHECKOUT_ENABLED = previousLiveGate;
  }
});

test("an expired Stripe attempt whose stored session is missing enters reconciliation without creating a new attempt", async () => {
  const payment = await createPayment();
  await expireStripeAttempt(payment, "cs_test_missing_session");
  const previousAuthUrl = process.env.BETTER_AUTH_URL;
  const previousRootDomain = process.env.PLATFORM_ROOT_DOMAIN;
  process.env.BETTER_AUTH_URL = "https://platform.example.test";
  process.env.PLATFORM_ROOT_DOMAIN = "example.test";
  const previousFetch = globalThis.fetch;
  let getCount = 0;
  let postCount = 0;
  globalThis.fetch = (async (_url: URL | RequestInfo, init?: RequestInit) => {
    if (init?.method === "POST") postCount += 1;
    else getCount += 1;
    return Response.json({ error: { type: "invalid_request_error" } }, { status: 404 });
  }) as typeof fetch;
  try {
    assert.equal(await createProviderCheckout(db, payment.storeId, payment.transaction.id, resolver), null);
    assert.equal(getCount, 1);
    assert.equal(postCount, 0);
    const [transaction, order, audit] = await Promise.all([
      db.paymentTransaction.findUniqueOrThrow({ where: { id: payment.transaction.id } }),
      db.order.findUniqueOrThrow({ where: { id: payment.order.id } }),
      db.auditEvent.findFirst({
        where: {
          action: "payment.stripe_checkout_reconciliation",
          targetId: payment.transaction.id,
        },
      }),
    ]);
    assert.equal(transaction.status, "RECONCILIATION");
    assert.equal(transaction.failureCode, "checkout_attempt_expired_unrecoverable_session");
    assert.equal(transaction.providerReference, null);
    assert.equal(transaction.checkoutAttempt, 1);
    assert.equal(order.status, "PENDING");
    assert.equal(order.paymentStatus, "UNPAID");
    assert.ok(audit);
    assert.equal(await db.order.count({ where: { storeId: payment.storeId } }), 1);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousAuthUrl === undefined) delete process.env.BETTER_AUTH_URL;
    else process.env.BETTER_AUTH_URL = previousAuthUrl;
    if (previousRootDomain === undefined) delete process.env.PLATFORM_ROOT_DOMAIN;
    else process.env.PLATFORM_ROOT_DOMAIN = previousRootDomain;
  }
});

test("an expired Stripe attempt with a completed but unverified session enters reconciliation without marking paid", async () => {
  const payment = await createPayment();
  await expireStripeAttempt(payment, "cs_test_completed_session");
  const previousAuthUrl = process.env.BETTER_AUTH_URL;
  const previousRootDomain = process.env.PLATFORM_ROOT_DOMAIN;
  process.env.BETTER_AUTH_URL = "https://platform.example.test";
  process.env.PLATFORM_ROOT_DOMAIN = "example.test";
  const previousFetch = globalThis.fetch;
  let postCount = 0;
  globalThis.fetch = (async (_url: URL | RequestInfo, init?: RequestInit) => {
    if (init?.method === "POST") postCount += 1;
    return Response.json({
      id: "cs_test_completed_session",
      url: null,
      status: "complete",
      client_reference_id: payment.transaction.id,
      payment_status: "unpaid",
      amount_total: 1299,
      currency: "aed",
      metadata: {
        payment_transaction_id: payment.transaction.id,
        store_id: payment.storeId,
        order_id: payment.order.id,
      },
    });
  }) as typeof fetch;
  try {
    assert.equal(await createProviderCheckout(db, payment.storeId, payment.transaction.id, resolver), null);
    assert.equal(postCount, 0);
    const [transaction, order, audit] = await Promise.all([
      db.paymentTransaction.findUniqueOrThrow({ where: { id: payment.transaction.id } }),
      db.order.findUniqueOrThrow({ where: { id: payment.order.id } }),
      db.auditEvent.findFirst({
        where: {
          action: "payment.stripe_checkout_reconciliation",
          targetId: payment.transaction.id,
        },
      }),
    ]);
    assert.equal(transaction.status, "RECONCILIATION");
    assert.equal(transaction.failureCode, "checkout_attempt_expired_unrecoverable_session");
    assert.equal(transaction.providerReference, "cs_test_completed_session");
    assert.equal(order.status, "PENDING");
    assert.equal(order.paymentStatus, "UNPAID");
    assert.ok(audit);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousAuthUrl === undefined) delete process.env.BETTER_AUTH_URL;
    else process.env.BETTER_AUTH_URL = previousAuthUrl;
    if (previousRootDomain === undefined) delete process.env.PLATFORM_ROOT_DOMAIN;
    else process.env.PLATFORM_ROOT_DOMAIN = previousRootDomain;
  }
});

test("an expired Stripe attempt's verified late payment stays in reconciliation if the order was cancelled", async () => {
  const payment = await createPayment();
  await expireStripeAttempt(payment);
  await db.order.update({
    where: { id: payment.order.id },
    data: { status: "CANCELLED" },
  });
  assert.equal(await createProviderCheckout(db, payment.storeId, payment.transaction.id, resolver), null);
  const event = signedEvent({
    transactionId: payment.transaction.id,
    storeId: payment.storeId,
    orderId: payment.order.id,
    amount: 1299,
  });
  assert.equal(await handleStripeWebhook(db, payment.providerAccount.id, event.body, event.headers, resolver), "accepted");
  const [order, transaction] = await Promise.all([
    db.order.findUniqueOrThrow({ where: { id: payment.order.id } }),
    db.paymentTransaction.findUniqueOrThrow({ where: { id: payment.transaction.id } }),
  ]);
  assert.equal(order.status, "CANCELLED");
  assert.equal(order.paymentStatus, "UNPAID");
  assert.equal(transaction.status, "RECONCILIATION");
  assert.equal(transaction.failureCode, "late_success_cancelled_order");
  assert.equal(transaction.providerReference, "cs_test_stored");
});

test("a timed-out Stripe session retries with the same attempt key and never duplicates the order or stock decrement", async () => {
  const owner = await testActor(db);
  const created = await createAdminStore(owner, db, {
    name: `Stripe retry ${uid()}`,
    slug: `stripe-retry-${uid()}`,
    businessType: "retail",
    status: "ACTIVE",
    ownerName: "Stripe Retry Owner",
    ownerEmail: `stripe-retry-${uid()}@example.com`,
    ownerPassword: "a stripe retry test passphrase 2026",
    countryCode: "AE",
    baseCurrency: "AED",
    timezone: "Asia/Dubai",
    defaultLanguage: "en",
    languages: ["en"],
    accentColor: "#123456",
  });

  assert.ok(created.ok, JSON.stringify(created));
  const storeId = created.data.id;
  const account = await db.paymentProviderAccount.create({
    data: {
      storeId,
      provider: "stripe_connect",
      displayName: "Stripe retry test",
      mode: "TEST",
      enabled: true,
      publicConfig: { accountId },
      secretRef: `vault:${storeId}/stripe/test`,
    },
  });
  await db.storePaymentMethod.create({
    data: { storeId, method: "stripe_checkout", enabled: true, providerAccountId: account.id },
  });
  const categoryResult = await createAdminCategory(db, storeId, { name: "Stripe retry category" });
  assert.ok(categoryResult.ok, JSON.stringify(categoryResult));
  const productResult = await createAdminProduct(db, storeId, {
    name: "Stripe retry product",
    sku: `STRIPE-${uid()}`.toUpperCase(),
    categoryId: categoryResult.data.id,
    description: "A test product for payment retry safety.",
    price: "12.99",
    compareAtPrice: "",
    deliveryFee: "0",
    freeDelivery: false,
    pickupOnly: true,
    imageUrl: "",
    stock: "3",
    status: "ACTIVE",
    featured: false,
  });
  assert.ok(productResult.ok, JSON.stringify(productResult));
  const variant = await db.productVariant.findFirstOrThrow({
    where: { productId: productResult.data.id, isDefault: true },
  });

  const previousAuthUrl = process.env.BETTER_AUTH_URL;
  const previousRootDomain = process.env.PLATFORM_ROOT_DOMAIN;
  process.env.BETTER_AUTH_URL = "https://platform.example.test";
  process.env.PLATFORM_ROOT_DOMAIN = "example.test";
  const previousFetch = globalThis.fetch;
  let timedOut = true;
  let checkoutSession: Record<string, unknown> | null = null;
  const idempotencyKeys: string[] = [];
  let sessionFetchCount = 0;
  globalThis.fetch = (async (url: URL | RequestInfo, init?: RequestInit) => {
    void url;
    if (init?.method === "POST") {
      sessionFetchCount += 1;
      idempotencyKeys.push(new Headers(init.headers).get("Idempotency-Key") ?? "");
      if (timedOut) {
        timedOut = false;
        throw new Error("simulated network timeout");
      }
      const form = new URLSearchParams(String(init.body));
      checkoutSession = {
        id: "cs_test_retry_session",
        url: "https://checkout.stripe.com/c/pay/cs_test_retry_session",
        status: "open",
        client_reference_id: form.get("client_reference_id"),
        payment_status: "unpaid",
        amount_total: Number(form.get("line_items[0][price_data][unit_amount]")),
        currency: form.get("line_items[0][price_data][currency]"),
        metadata: {
          store_id: form.get("metadata[store_id]"),
          order_id: form.get("metadata[order_id]"),
          payment_transaction_id: form.get("metadata[payment_transaction_id]"),
        },
      };
      return Response.json(checkoutSession);
    }
    return Response.json(checkoutSession);
  }) as typeof fetch;
  const input = {
    storeId,
    idempotencyKey: randomUUID(),
    expectedTotalMinor: "1299",
    fulfillmentMethod: "PICKUP",
    items: [{ productId: productResult.data.id, quantity: 1 }],
    name: "Retry Customer",
    email: `retry-customer-${uid()}@example.com`,
    phone: "0501234567",
    address: "Pickup counter",
    city: "Dubai",
    paymentMethod: "stripe_checkout",
  };
  try {
    const first = await placeOrder(db, storeId, input, { ipAddress: `10.2.${uid()}` }, { paymentCredentialResolver: resolver });
    assert.equal(first.ok, false);
    if (!first.ok) assert.equal(first.retrySameKey, true);
    const retried = await placeOrder(db, storeId, input, { ipAddress: `10.2.${uid()}` }, { paymentCredentialResolver: resolver });
    assert.ok(retried.ok, JSON.stringify(retried));
    if (!retried.ok) return;
    assert.equal(retried.duplicate, true);
    assert.deepEqual(retried.checkout, {
      kind: "redirect",
      url: "https://checkout.stripe.com/c/pay/cs_test_retry_session",
    });
    const recovered = await placeOrder(db, storeId, input, { ipAddress: `10.2.${uid()}` }, { paymentCredentialResolver: resolver });
    assert.ok(recovered.ok, JSON.stringify(recovered));
    if (!recovered.ok) return;
    assert.deepEqual(recovered.checkout, retried.checkout);
    assert.equal(sessionFetchCount, 2);
    assert.equal(idempotencyKeys[0], idempotencyKeys[1]);
    assert.equal(await db.order.count({ where: { storeId } }), 1);
    assert.equal(await db.paymentTransaction.count({ where: { storeId } }), 1);
    assert.equal((await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).stock, 2);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousAuthUrl === undefined) delete process.env.BETTER_AUTH_URL;
    else process.env.BETTER_AUTH_URL = previousAuthUrl;
    if (previousRootDomain === undefined) delete process.env.PLATFORM_ROOT_DOMAIN;
    else process.env.PLATFORM_ROOT_DOMAIN = previousRootDomain;
  }
});

test("manual Stripe refunds are recorded only after provider verification and track partial/full totals", async () => {
  const payment = await createPayment();
  await db.order.update({ where: { id: payment.order.id }, data: { paymentStatus: "PAID" } });
  await db.paymentTransaction.update({
    where: { id: payment.transaction.id },
    data: { status: "SUCCEEDED", settledAt: new Date() },
  });

  const previousAuthUrl = process.env.BETTER_AUTH_URL;
  const previousRootDomain = process.env.PLATFORM_ROOT_DOMAIN;
  process.env.BETTER_AUTH_URL = "https://platform.example.test";
  process.env.PLATFORM_ROOT_DOMAIN = "example.test";
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async (url: URL | RequestInfo) => {
    const target = String(url);
    if (target.includes("/checkout/sessions/")) {
      return Response.json({
        id: "cs_test_stored",
        url: null,
        client_reference_id: payment.transaction.id,
        payment_status: "paid",
        amount_total: 1299,
        currency: "aed",
        payment_intent: "pi_test_stored",
        metadata: {
          payment_transaction_id: payment.transaction.id,
          store_id: payment.storeId,
          order_id: payment.order.id,
        },
      });
    }
    const refundId = target.split("/").at(-1);
    return Response.json({
      id: refundId,
      amount: refundId === "re_test_partial" ? 500 : 799,
      currency: "aed",
      status: "succeeded",
      payment_intent: "pi_test_stored",
    });
  }) as typeof fetch;
  try {
    const invalid = await recordManualStripeRefund(
      db,
      payment.storeId,
      payment.order.id,
      payment.actorUserId,
      "not-a-refund",
      resolver,
    );
    assert.equal(invalid.ok, false);
    assert.equal(await db.paymentRefund.count({ where: { orderId: payment.order.id } }), 0);

    const partial = await recordManualStripeRefund(
      db,
      payment.storeId,
      payment.order.id,
      payment.actorUserId,
      "re_test_partial",
      resolver,
    );
    assert.equal(partial.ok, true, JSON.stringify(partial));
    const partialOrder = await db.order.findUniqueOrThrow({ where: { id: payment.order.id } });
    const partialTransaction = await db.paymentTransaction.findUniqueOrThrow({ where: { id: payment.transaction.id } });
    assert.equal(partialOrder.paymentStatus, "PARTIALLY_REFUNDED");
    assert.equal(partialTransaction.status, "PARTIALLY_REFUNDED");

    const duplicate = await recordManualStripeRefund(
      db,
      payment.storeId,
      payment.order.id,
      payment.actorUserId,
      "re_test_partial",
      resolver,
    );
    assert.equal(duplicate.ok, false);
    assert.equal(await db.paymentRefund.count({ where: { orderId: payment.order.id } }), 1);

    const full = await recordManualStripeRefund(
      db,
      payment.storeId,
      payment.order.id,
      payment.actorUserId,
      "re_test_full",
      resolver,
    );
    assert.equal(full.ok, true, JSON.stringify(full));
    const refundedOrder = await db.order.findUniqueOrThrow({ where: { id: payment.order.id } });
    const refundedTransaction = await db.paymentTransaction.findUniqueOrThrow({ where: { id: payment.transaction.id } });
    assert.equal(refundedOrder.paymentStatus, "REFUNDED");
    assert.equal(refundedTransaction.status, "REFUNDED");
    assert.equal(await db.paymentRefund.count({ where: { orderId: payment.order.id } }), 2);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousAuthUrl === undefined) delete process.env.BETTER_AUTH_URL;
    else process.env.BETTER_AUTH_URL = previousAuthUrl;
    if (previousRootDomain === undefined) delete process.env.PLATFORM_ROOT_DOMAIN;
    else process.env.PLATFORM_ROOT_DOMAIN = previousRootDomain;
  }
});

test("pending payments block credential rotation while settled history rotates to a new provider-account record", async () => {
  const payment = await createPayment();
  const settings = {
    paymentMethods: {
      cash_on_delivery: false,
      card_on_delivery: false,
      bank_transfer: false,
      cash_on_pickup: false,
    },
    bankTransfer: {},
    stripe: {
      enabled: true,
      mode: "LIVE",
      accountId: "acct_87654321",
      secretRef: `vault:${payment.storeId}/stripe/rotated`,
    },
    jazzcash: { enabled: false, merchantId: "", secretRef: "" },
  };
  const blocked = await updateStoreOwnerSettings(
    db,
    payment.storeId,
    payment.actorUserId,
    settings,
  );
  assert.equal(blocked.ok, false);
  if (!blocked.ok) assert.match(blocked.error, /unresolved payment attempts/i);
  const originalAccount = await db.paymentProviderAccount.findUniqueOrThrow({
    where: { id: payment.providerAccount.id },
  });
  assert.equal(originalAccount.mode, "TEST");
  assert.equal(originalAccount.secretRef, `vault:${payment.storeId}/stripe/test`);

  await db.paymentTransaction.update({
    where: { id: payment.transaction.id },
    data: { status: "SUCCEEDED", settledAt: new Date() },
  });
  await db.order.update({ where: { id: payment.order.id }, data: { paymentStatus: "PAID" } });
  const rotated = await updateStoreOwnerSettings(
    db,
    payment.storeId,
    payment.actorUserId,
    settings,
  );
  assert.equal(rotated.ok, true, JSON.stringify(rotated));
  const [oldAccount, newAccount, oldTransaction] = await Promise.all([
    db.paymentProviderAccount.findUniqueOrThrow({ where: { id: payment.providerAccount.id } }),
    db.paymentProviderAccount.findFirstOrThrow({
      where: { storeId: payment.storeId, provider: "stripe_connect", id: { not: payment.providerAccount.id } },
    }),
    db.paymentTransaction.findUniqueOrThrow({ where: { id: payment.transaction.id } }),
  ]);
  assert.equal(oldAccount.enabled, false);
  assert.equal(oldAccount.secretRef, `vault:${payment.storeId}/stripe/test`);
  assert.equal(newAccount.mode, "LIVE");
  assert.equal(newAccount.secretRef, `vault:${payment.storeId}/stripe/rotated`);
  assert.equal(oldTransaction.providerAccountId, oldAccount.id);
});
