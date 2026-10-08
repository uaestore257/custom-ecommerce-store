import "server-only";
import { Prisma, type PrismaClient } from "@/lib/generated/prisma/client";
import { isBrowserSafeProviderCheckout } from "@/lib/payments/rules";
import { storefrontUrlForSlug, storeHostConfig } from "@/lib/store-host";
import { recordAudit } from "../audit";
import { liveStripeCheckoutEnabled, paymentCredentialsAvailable, resolvePaymentCredentials, runtimePaymentCredentialResolver } from "./credentials";
import { paymentProviderAdapter } from "./providers";
import type {
  PaymentCredentialContext,
  PaymentCredentialResolver,
  PaymentProviderAccountConfig,
  ProviderCheckoutInput,
  ProviderCheckoutSession,
  VerifiedPaymentEvent,
} from "./types";

type Client = PrismaClient | Prisma.TransactionClient;
const STRIPE_IDEMPOTENCY_WINDOW_MS = 23 * 60 * 60 * 1000;
const EXPIRED_STRIPE_ATTEMPT_FAILURE = "checkout_attempt_expired_unrecoverable_session";

class RefundRefused extends Error {}

const providerAccountSelection = {
  id: true,
  storeId: true,
  provider: true,
  mode: true,
  enabled: true,
  publicConfig: true,
  secretRef: true,
} as const;

function plainRecord(value: Prisma.JsonValue): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function accountContext(account: PaymentProviderAccountConfig): PaymentCredentialContext | null {
  if (!account.secretRef) return null;
  if (account.provider !== "stripe_connect" && account.provider !== "jazzcash") return null;
  const publicConfig = plainRecord(account.publicConfig as Prisma.JsonValue);
  return {
    secretRef: account.secretRef,
    provider: account.provider as "stripe_connect" | "jazzcash",
    storeId: account.storeId,
    providerAccountId: account.id,
    mode: account.mode,
    ...(account.provider === "stripe_connect" && typeof publicConfig.accountId === "string"
      ? { connectedAccountId: publicConfig.accountId }
      : {}),
  };
}

function storefrontOrigin(slug: string): string | null {
  const baseUrl = process.env.BETTER_AUTH_URL;
  if (!baseUrl) return null;
  const home = storefrontUrlForSlug(slug, baseUrl, storeHostConfig());
  if (!home) return null;
  return new URL(home).origin;
}

async function loadPaymentTransaction(client: Client, storeId: string, transactionId: string) {
  return client.paymentTransaction.findFirst({
    where: { id: transactionId, storeId },
    include: {
      order: { select: { id: true, number: true, totalMinor: true, currency: true, paymentStatus: true } },
      providerAccount: { select: providerAccountSelection },
      store: { select: { id: true, slug: true, countryCode: true, baseCurrency: true, status: true, archivedAt: true } },
    },
  });
}

function checkoutInput(
  row: NonNullable<Awaited<ReturnType<typeof loadPaymentTransaction>>>,
  providerAccount: PaymentProviderAccountConfig,
  requireActiveStore = true,
): ProviderCheckoutInput | null {
  if (
    (requireActiveStore && (row.store.status !== "ACTIVE" || row.store.archivedAt)) ||
    row.providerAccountId !== providerAccount.id
  ) return null;
  const storeOrigin = storefrontOrigin(row.store.slug);
  if (!storeOrigin) return null;
  return {
    storeId: row.storeId,
    providerAccountId: providerAccount.id,
    transactionId: row.id,
    checkoutAttempt: row.checkoutAttempt,
    orderId: row.order.id,
    orderNumber: String(row.order.number),
    amountMinor: row.amountMinor,
    currency: row.currency,
    storeOrigin,
    publicConfig: plainRecord(providerAccount.publicConfig as Prisma.JsonValue),
  };
}

async function reconcileExpiredStripeAttempt(
  client: PrismaClient,
  transaction: {
    id: string;
    orderId: string;
    providerReference: string | null;
    checkoutAttempt: number;
  },
  storeId: string,
  providerAccountId: string,
  clearProviderReference = true,
): Promise<void> {
  const expiredBefore = new Date(Date.now() - STRIPE_IDEMPOTENCY_WINDOW_MS);
  await client.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${transaction.orderId} AND "storeId" = ${storeId} FOR UPDATE`;
    const updated = await tx.paymentTransaction.updateMany({
      where: {
        id: transaction.id,
        storeId,
        providerAccountId,
        status: "PENDING",
        providerReference: transaction.providerReference,
        checkoutAttempt: transaction.checkoutAttempt,
        OR: [
          { checkoutAttemptStartedAt: null },
          { checkoutAttemptStartedAt: { lte: expiredBefore } },
        ],
      },
      data: {
        status: "RECONCILIATION",
        ...(clearProviderReference ? { providerReference: null } : {}),
        failureCode: EXPIRED_STRIPE_ATTEMPT_FAILURE,
      },
    });
    if (updated.count === 1) {
      await recordAudit(tx, {
        action: "payment.stripe_checkout_reconciliation",
        storeId,
        targetType: "payment_transaction",
        targetId: transaction.id,
        metadata: {
          reason: EXPIRED_STRIPE_ATTEMPT_FAILURE,
          checkoutAttempt: transaction.checkoutAttempt,
          providerAccountId,
        },
      });
    }
  });
}

export interface ProviderCheckoutResult {
  session: ProviderCheckoutSession;
}

export async function createProviderCheckout(
  client: PrismaClient,
  storeId: string,
  transactionId: string,
  resolver: PaymentCredentialResolver = runtimePaymentCredentialResolver,
): Promise<ProviderCheckoutResult | null> {
  const row = await loadPaymentTransaction(client, storeId, transactionId);
  const account = row?.providerAccount;
  if (
    !row ||
    row.status !== "PENDING" ||
    !account ||
    !account.enabled ||
    (account.provider === "jazzcash" && account.mode !== "TEST") ||
    (account.provider !== "stripe_connect" && account.provider !== "jazzcash") ||
    !account.secretRef
  ) {
    return null;
  }
  const adapter = paymentProviderAdapter(account.provider);
  const context = accountContext(account);
  if (!adapter || !context) return null;
  const paymentMethod = await client.storePaymentMethod.findFirst({
    where: { storeId, method: adapter.method, providerAccountId: account.id },
    select: { enabled: true },
  });
  if (
    account.provider === "stripe_connect" &&
    !row.providerReference &&
    row.checkoutAttempt > 0 &&
    (!row.checkoutAttemptStartedAt ||
      Date.now() - row.checkoutAttemptStartedAt.getTime() >= STRIPE_IDEMPOTENCY_WINDOW_MS)
  ) {
    await reconcileExpiredStripeAttempt(client, row, storeId, account.id);
    return null;
  }
  if (!row.providerReference && !paymentMethod?.enabled) return null;
  if (!(await paymentCredentialsAvailable(resolver, context))) return null;
  const credentials = await resolvePaymentCredentials(resolver, context);
  if (!credentials) return null;
  let current = row;
  if (current.providerReference && adapter.recoverCheckout) {
    const input = checkoutInput(current, account);
    if (!input) return null;
    const recovered = await adapter.recoverCheckout(input, current.providerReference, credentials);
    if (
      (recovered === "missing" || recovered === "complete") &&
      (!current.checkoutAttemptStartedAt ||
        Date.now() - current.checkoutAttemptStartedAt.getTime() >= STRIPE_IDEMPOTENCY_WINDOW_MS)
    ) {
      await reconcileExpiredStripeAttempt(
        client,
        current,
        storeId,
        account.id,
        recovered === "missing",
      );
      return null;
    }
    if (recovered === "missing" || recovered === "complete") return null;
    if (recovered === "expired") {
      if (!paymentMethod?.enabled) return null;
      const advanced = await client.paymentTransaction.updateMany({
        where: {
          id: current.id,
          storeId,
          status: "PENDING",
          providerAccountId: account.id,
          providerReference: current.providerReference,
          checkoutAttempt: current.checkoutAttempt,
        },
        data: {
          providerReference: null,
          checkoutAttempt: { increment: 1 },
          checkoutAttemptStartedAt: new Date(),
        },
      });
      if (advanced.count !== 1) return null;
      const refreshed = await loadPaymentTransaction(client, storeId, transactionId);
      if (!refreshed) return null;
      current = refreshed;
    } else {
      if (!recovered || !isBrowserSafeProviderCheckout(recovered, credentials.secrets)) return null;
      return { session: recovered };
    }
  } else if (current.providerReference) {
    return null;
  }

  if (current.checkoutAttempt === 0) {
    await client.paymentTransaction.updateMany({
      where: {
        id: current.id,
        storeId,
        status: "PENDING",
        providerAccountId: account.id,
        providerReference: null,
        checkoutAttempt: 0,
      },
      data: { checkoutAttempt: 1, checkoutAttemptStartedAt: new Date() },
    });
    const refreshed = await loadPaymentTransaction(client, storeId, transactionId);
    if (!refreshed) return null;
    current = refreshed;
  }
  if (
    !current.providerReference &&
    account.provider === "stripe_connect" &&
    account.mode === "LIVE" &&
    !liveStripeCheckoutEnabled()
  ) {
    return null;
  }
  if (
    !current.providerReference &&
    (!current.checkoutAttemptStartedAt ||
      Date.now() - current.checkoutAttemptStartedAt.getTime() >= STRIPE_IDEMPOTENCY_WINDOW_MS)
  ) {
    if (account.provider === "stripe_connect") {
      await reconcileExpiredStripeAttempt(client, current, storeId, account.id);
    }
    return null;
  }
  const input = checkoutInput(current, account);
  if (!input) return null;
  const session = await adapter.createCheckout(input, credentials);
  if (!isBrowserSafeProviderCheckout(session, credentials.secrets)) return null;
  const stored = await client.paymentTransaction.updateMany({
    where: {
      id: current.id,
      storeId,
      status: "PENDING",
      providerAccountId: account.id,
      checkoutAttempt: current.checkoutAttempt,
      OR: [{ providerReference: null }, { providerReference: session.providerReference }],
    },
    data: { providerReference: session.providerReference },
  });
  if (stored.count !== 1) return null;
  return { session };
}

async function saveVerifiedPaymentEvent(
  client: PrismaClient,
  storeId: string,
  providerAccountId: string,
  event: VerifiedPaymentEvent,
): Promise<"processed" | "duplicate" | "rejected"> {
  try {
    return await client.$transaction(async (tx) => {
      const initialTransaction = await tx.paymentTransaction.findFirst({
        where: {
          id: event.paymentTransactionId,
          storeId,
          providerAccountId,
        },
        select: {
          id: true,
          amountMinor: true,
          currency: true,
          status: true,
          providerReference: true,
          failureCode: true,
          checkoutAttempt: true,
          orderId: true,
          order: { select: { status: true, paymentStatus: true } },
        },
      });
      if (
        !initialTransaction ||
        (event.storeId !== undefined && event.storeId !== storeId) ||
        (event.orderId !== undefined && event.orderId !== initialTransaction.orderId) ||
        initialTransaction.amountMinor !== event.amountMinor ||
        initialTransaction.currency !== event.currency ||
        (initialTransaction.providerReference !== null
          ? initialTransaction.providerReference !== event.transactionReference
          : initialTransaction.checkoutAttempt < 1)
      ) {
        return "rejected";
      }
      await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${initialTransaction.orderId} AND "storeId" = ${storeId} FOR UPDATE`;
      const currentTransaction = await tx.paymentTransaction.findFirst({
        where: {
          id: initialTransaction.id,
          storeId,
          providerAccountId,
        },
        select: {
          id: true,
          amountMinor: true,
          currency: true,
          status: true,
          providerReference: true,
          failureCode: true,
          checkoutAttempt: true,
          orderId: true,
        },
      });
      if (
        !currentTransaction ||
        currentTransaction.amountMinor !== event.amountMinor ||
        currentTransaction.currency !== event.currency ||
        currentTransaction.orderId !== initialTransaction.orderId ||
        (currentTransaction.providerReference !== null
          ? currentTransaction.providerReference !== event.transactionReference
          : currentTransaction.checkoutAttempt < 1)
      ) {
        return "rejected";
      }
      const transaction = currentTransaction;
      const order = await tx.order.findFirst({
        where: { id: transaction.orderId, storeId },
        select: { status: true, paymentStatus: true, totalMinor: true, currency: true },
      });
      if (!order || order.totalMinor !== event.amountMinor || order.currency !== event.currency) return "rejected";

      await tx.paymentWebhookEvent.create({
        data: {
          storeId,
          providerAccountId,
          transactionId: transaction.id,
          eventId: event.eventId,
          eventType: event.eventType.slice(0, 120),
          processedAt: new Date(),
        },
      });

      const expiredStripeAttempt =
        transaction.status === "RECONCILIATION" &&
        transaction.failureCode === EXPIRED_STRIPE_ATTEMPT_FAILURE;
      if (
        transaction.status === "SUCCEEDED" ||
        transaction.status === "REFUNDED" ||
        transaction.status === "PARTIALLY_REFUNDED" ||
        (transaction.status === "RECONCILIATION" && !expiredStripeAttempt)
      ) {
        return "processed";
      }
      const lateSuccess = event.outcome === "SUCCEEDED" && order.status === "CANCELLED";
      const reconciledStatus =
        lateSuccess || (expiredStripeAttempt && event.outcome === "PENDING")
          ? "RECONCILIATION"
          : event.outcome;
      const updated = await tx.paymentTransaction.updateMany({
        where: {
          id: transaction.id,
          storeId,
          status: {
            in: ["PENDING", "FAILED", "CANCELLED", ...(expiredStripeAttempt ? ["RECONCILIATION" as const] : [])],
          },
        },
        data: {
          status: reconciledStatus,
          providerReference: event.transactionReference,
          settledAt: event.outcome === "SUCCEEDED" ? new Date() : null,
          failureCode: lateSuccess
            ? "late_success_cancelled_order"
            : expiredStripeAttempt && event.outcome === "PENDING"
              ? EXPIRED_STRIPE_ATTEMPT_FAILURE
              : event.outcome === "FAILED"
                ? event.eventType.slice(0, 80)
                : null,
        },
      });
      if (updated.count !== 1) return "processed";

      if (event.outcome === "SUCCEEDED" && !lateSuccess) {
        await tx.order.updateMany({
          where: { id: transaction.orderId, storeId, status: { not: "CANCELLED" }, paymentStatus: "UNPAID" },
          data: { paymentStatus: "PAID" },
        });
      }
      return "processed";
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return "duplicate";
    throw error;
  }
}

export async function verifyProviderReturn(
  client: PrismaClient,
  storeId: string,
  transactionId: string,
  query: URLSearchParams,
  resolver: PaymentCredentialResolver = runtimePaymentCredentialResolver,
): Promise<"paid" | "pending" | "failed" | "cancelled" | "invalid"> {
  const row = await loadPaymentTransaction(client, storeId, transactionId);
  const account = row?.providerAccount;
  if (
    !row ||
    !account ||
    (account.provider === "jazzcash" && account.mode !== "TEST") ||
    (account.provider !== "stripe_connect" && account.provider !== "jazzcash") ||
    !account.secretRef
  ) {
    return "invalid";
  }
  const adapter = paymentProviderAdapter(account.provider);
  const context = accountContext(account);
  const input = checkoutInput(row, account);
  if (!adapter?.verifyReturn || !context || !input) return "invalid";
  const credentials = await resolvePaymentCredentials(resolver, context);
  if (!credentials) return "invalid";
  const event = await adapter.verifyReturn(input, query, credentials);
  if (!event) return "invalid";
  if (
    event.paymentTransactionId !== row.id ||
    event.transactionReference !== row.providerReference ||
    event.amountMinor !== row.amountMinor ||
    event.currency !== row.currency ||
    row.order.totalMinor !== row.amountMinor ||
    row.order.currency !== row.currency
  ) return "invalid";
  switch (row.status) {
    case "SUCCEEDED":
    case "REFUNDED":
    case "PARTIALLY_REFUNDED":
      return "paid";
    case "FAILED":
      return "failed";
    case "CANCELLED":
      return "cancelled";
    case "PENDING":
    case "RECONCILIATION":
      return "pending";
  }
}

export async function handleStripeWebhook(
  client: PrismaClient,
  providerAccountId: string,
  rawBody: string,
  headers: Headers,
  resolver: PaymentCredentialResolver = runtimePaymentCredentialResolver,
): Promise<"accepted" | "duplicate" | "invalid"> {
  const account = await client.paymentProviderAccount.findFirst({
    where: { id: providerAccountId, provider: "stripe_connect" },
    select: {
      ...providerAccountSelection,
      store: { select: { id: true, countryCode: true, baseCurrency: true, status: true, archivedAt: true } },
    },
  });
  if (!account || !account.secretRef) return "invalid";
  const adapter = paymentProviderAdapter(account.provider);
  const context = accountContext(account);
  if (!adapter?.verifyWebhook || !context) return "invalid";
  const credentials = await resolvePaymentCredentials(resolver, context);
  if (!credentials) return "invalid";
  const accountId = plainRecord(account.publicConfig as Prisma.JsonValue).accountId;
  if (typeof accountId !== "string") return "invalid";
  const event = await adapter.verifyWebhook(rawBody, headers, credentials, accountId);
  if (!event) return "invalid";
  const result = await saveVerifiedPaymentEvent(client, account.storeId, account.id, event);
  return result === "rejected" ? "invalid" : result === "duplicate" ? "duplicate" : "accepted";
}

export async function recordManualStripeRefund(
  client: PrismaClient,
  storeId: string,
  orderId: string,
  actorUserId: string,
  refundIdValue: unknown,
  resolver: PaymentCredentialResolver = runtimePaymentCredentialResolver,
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  if (typeof refundIdValue !== "string" || refundIdValue.length > 255 || !/^re_[A-Za-z0-9_]+$/.test(refundIdValue)) {
    return { ok: false, error: "Enter a valid Stripe refund ID from the connected account's Dashboard." };
  }
  const row = await client.paymentTransaction.findFirst({
    where: {
      storeId,
      orderId,
      method: "stripe_checkout",
      status: { in: ["SUCCEEDED", "PARTIALLY_REFUNDED", "RECONCILIATION"] },
    },
    orderBy: { createdAt: "desc" },
    include: {
      order: { select: { id: true, number: true, status: true, totalMinor: true, currency: true, paymentStatus: true } },
      providerAccount: { select: providerAccountSelection },
      store: { select: { id: true, slug: true, countryCode: true, baseCurrency: true, status: true, archivedAt: true } },
    },
  });
  const account = row?.providerAccount;
  if (
    !row ||
    !account ||
    account.provider !== "stripe_connect" ||
    !row.providerReference ||
    !account.secretRef ||
    row.order.totalMinor !== row.amountMinor ||
    row.order.currency !== row.currency
  ) {
    return { ok: false, error: "No verifiable Stripe payment is available for this order." };
  }
  const adapter = paymentProviderAdapter("stripe_connect");
  const context = accountContext(account);
  const input = checkoutInput(row, account, false);
  if (!adapter?.verifyRefund || !context || !input) {
    return { ok: false, error: "Stripe refund verification is unavailable for this payment." };
  }
  const credentials = await resolvePaymentCredentials(resolver, context);
  if (!credentials) return { ok: false, error: "The original Stripe account credentials are unavailable." };
  const evidence = await adapter.verifyRefund(input, row.providerReference, refundIdValue, credentials);
  if (!evidence || evidence.currency !== row.currency || evidence.amountMinor > row.amountMinor) {
    return { ok: false, error: "Stripe did not confirm a matching successful refund for this payment." };
  }

  try {
    await client.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "PaymentTransaction" WHERE "id" = ${row.id} AND "storeId" = ${storeId} FOR UPDATE`;
      const current = await tx.paymentTransaction.findFirst({
        where: {
          id: row.id,
          storeId,
          providerAccountId: account.id,
          status: { in: ["SUCCEEDED", "PARTIALLY_REFUNDED", "RECONCILIATION"] },
        },
        include: {
          order: { select: { id: true, status: true, totalMinor: true, currency: true, paymentStatus: true } },
        },
      });
      if (!current || current.order.currency !== evidence.currency) {
        throw new RefundRefused("The payment changed while its Stripe refund was being verified.");
      }
      if (
        current.order.paymentStatus !== "PAID" &&
        current.order.paymentStatus !== "PARTIALLY_REFUNDED" &&
        current.status !== "RECONCILIATION"
      ) {
        throw new RefundRefused("This order is not in a refundable payment state.");
      }
      const recorded = await tx.paymentRefund.aggregate({
        where: { transactionId: current.id, storeId },
        _sum: { amountMinor: true },
      });
      const refundedTotal = (recorded._sum.amountMinor ?? BigInt(0)) + evidence.amountMinor;
      if (refundedTotal > current.amountMinor) {
        throw new RefundRefused("The confirmed refund would exceed the original Stripe payment.");
      }
      await tx.paymentRefund.create({
        data: {
          storeId,
          orderId,
          transactionId: current.id,
          providerAccountId: account.id,
          actorUserId,
          stripeRefundId: evidence.providerRefundId,
          amountMinor: evidence.amountMinor,
          currency: evidence.currency,
          reason: "Verified Stripe Dashboard refund",
        },
      });
      const complete = refundedTotal === current.amountMinor;
      await tx.paymentTransaction.update({
        where: { id_storeId: { id: current.id, storeId } },
        data: { status: complete ? "REFUNDED" : "PARTIALLY_REFUNDED" },
      });
      await tx.order.updateMany({
        where: { id: orderId, storeId },
        data: { paymentStatus: complete ? "REFUNDED" : "PARTIALLY_REFUNDED" },
      });
      await recordAudit(tx, {
        action: "payment.stripe_refund_recorded",
        actorUserId,
        storeId,
        targetType: "order",
        targetId: orderId,
        metadata: {
          refundId: evidence.providerRefundId,
          amountMinor: evidence.amountMinor.toString(),
          currency: evidence.currency,
          refundedTotalMinor: refundedTotal.toString(),
        },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "This Stripe refund has already been recorded." };
    }
    if (error instanceof RefundRefused) return { ok: false, error: error.message };
    throw error;
  }
  return { ok: true, message: "Confirmed Stripe refund recorded." };
}
