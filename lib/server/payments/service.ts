import "server-only";
import { Prisma, type PrismaClient } from "@/lib/generated/prisma/client";
import { isBrowserSafeProviderCheckout } from "@/lib/payments/rules";
import { storefrontUrlForSlug, storeHostConfig } from "@/lib/store-host";
import { paymentCredentialsAvailable, resolvePaymentCredentials, runtimePaymentCredentialResolver } from "./credentials";
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
  return {
    secretRef: account.secretRef,
    provider: account.provider as "stripe_connect" | "jazzcash",
    storeId: account.storeId,
    providerAccountId: account.id,
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
): ProviderCheckoutInput | null {
  if (row.store.status !== "ACTIVE" || row.store.archivedAt || row.providerAccountId !== providerAccount.id) return null;
  const storeOrigin = storefrontOrigin(row.store.slug);
  if (!storeOrigin) return null;
  return {
    storeId: row.storeId,
    providerAccountId: providerAccount.id,
    transactionId: row.id,
    orderId: row.order.id,
    orderNumber: String(row.order.number),
    amountMinor: row.amountMinor,
    currency: row.currency,
    storeOrigin,
    publicConfig: plainRecord(providerAccount.publicConfig as Prisma.JsonValue),
  };
}

export interface ProviderCheckoutResult {
  session: ProviderCheckoutSession;
}

export async function createProviderCheckout(
  client: PrismaClient | Prisma.TransactionClient,
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
    account.mode !== "TEST" ||
    (account.provider !== "stripe_connect" && account.provider !== "jazzcash") ||
    !account.secretRef
  ) {
    return null;
  }
  const adapter = paymentProviderAdapter(account.provider);
  const context = accountContext(account);
  if (!adapter || !context || !(await paymentCredentialsAvailable(resolver, context))) return null;
  const credentials = await resolvePaymentCredentials(resolver, context);
  const input = checkoutInput(row, account);
  if (!credentials || !input) return null;

  const session = await adapter.createCheckout(input, credentials);
  if (!isBrowserSafeProviderCheckout(session, credentials.secrets)) return null;
  await client.paymentTransaction.updateMany({
    where: { id: row.id, storeId, status: "PENDING", providerAccountId: account.id },
    data: { providerReference: session.providerReference },
  });
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
      const transaction = await tx.paymentTransaction.findFirst({
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
          orderId: true,
        },
      });
      if (
        !transaction ||
        transaction.amountMinor !== event.amountMinor ||
        transaction.currency !== event.currency ||
        (transaction.providerReference !== null && transaction.providerReference !== event.transactionReference)
      ) {
        return "rejected";
      }

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

      if (transaction.status === "SUCCEEDED" || transaction.status === "REFUNDED") return "processed";
      const updated = await tx.paymentTransaction.updateMany({
        where: { id: transaction.id, storeId, status: { in: ["PENDING", "FAILED", ...(event.outcome === "SUCCEEDED" ? ["CANCELLED" as const] : [])] } },
        data: {
          status: event.outcome,
          providerReference: event.transactionReference,
          settledAt: event.outcome === "SUCCEEDED" ? new Date() : null,
          failureCode: event.outcome === "FAILED" ? event.eventType.slice(0, 80) : null,
        },
      });
      if (updated.count !== 1) return "processed";

      if (event.outcome === "SUCCEEDED") {
        await tx.order.updateMany({
          where: { id: transaction.orderId, storeId, paymentStatus: "UNPAID" },
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
    !account.enabled ||
    account.mode !== "TEST" ||
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
  const result = await saveVerifiedPaymentEvent(client, storeId, account.id, event);
  if (result === "rejected") return "invalid";
  switch (event.outcome) {
    case "SUCCEEDED":
      return "paid";
    case "FAILED":
      return "failed";
    case "CANCELLED":
      return "cancelled";
    case "PENDING":
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
    where: { id: providerAccountId, provider: "stripe_connect", enabled: true, mode: "TEST" },
    select: {
      ...providerAccountSelection,
      store: { select: { id: true, countryCode: true, baseCurrency: true, status: true, archivedAt: true } },
    },
  });
  if (!account || account.store.status !== "ACTIVE" || account.store.archivedAt || !account.secretRef) return "invalid";
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
