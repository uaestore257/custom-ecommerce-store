import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { Prisma, type PrismaClient } from "@/lib/generated/prisma/client";
import { isProviderMarketSupported } from "@/lib/payments/rules";
import { recordAudit } from "../audit";
import { storeAdminUrlForSlug, storeHostConfig } from "@/lib/store-host";

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

type StripeMode = "TEST" | "LIVE";

function oauthConfiguration(mode: StripeMode) {
  const prefix = mode === "LIVE" ? "STRIPE_LIVE" : "STRIPE_TEST";
  const clientId = process.env[`${prefix}_CONNECT_CLIENT_ID`];
  const apiKey = process.env[`${prefix}_SECRET_KEY`];
  const redirectUri = process.env.STRIPE_CONNECT_REDIRECT_URI;
  if (
    !clientId?.startsWith("ca_") ||
    !apiKey?.startsWith(mode === "LIVE" ? "sk_live_" : "sk_test_") ||
    !redirectUri
  ) return null;
  let redirectUrl: URL;
  try {
    redirectUrl = new URL(redirectUri);
  } catch {
    return null;
  }
  if (
    (redirectUrl.protocol !== "https:" && redirectUrl.hostname !== "localhost") ||
    redirectUrl.pathname !== "/api/stripe/connect/callback" ||
    redirectUrl.search ||
    redirectUrl.hash
  ) return null;
  return { clientId, apiKey, redirectUri: redirectUrl.toString() };
}

export function stripeConnectEnvironmentReady(mode: StripeMode): boolean {
  return Boolean(
    oauthConfiguration(mode) &&
    process.env[mode === "LIVE" ? "STRIPE_LIVE_WEBHOOK_SECRET" : "STRIPE_TEST_WEBHOOK_SECRET"]?.startsWith("whsec_"),
  );
}

function stateDigest(state: string) {
  return createHash("sha256").update(state).digest("hex");
}

export async function beginStripeConnectOAuth(
  client: PrismaClient,
  storeId: string,
  actorUserId: string,
  modeValue: unknown,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (modeValue !== "TEST" && modeValue !== "LIVE") {
    return { ok: false, error: "Choose a valid Stripe connection mode." };
  }
  const mode = modeValue as StripeMode;
  const config = oauthConfiguration(mode);
  if (!config) {
    return { ok: false, error: `Stripe ${mode.toLowerCase()} Connect is not configured by the platform.` };
  }
  const store = await client.store.findFirst({
    where: { id: storeId, status: "ACTIVE", archivedAt: null },
    select: { id: true, countryCode: true, baseCurrency: true },
  });
  if (!store || !isProviderMarketSupported("stripe_connect", store.countryCode, store.baseCurrency)) {
    return { ok: false, error: "Stripe Connect is not available for this store's market." };
  }
  const unresolved = await client.paymentTransaction.findFirst({
    where: {
      storeId,
      providerAccount: { is: { provider: "stripe_connect" } },
      status: { in: ["PENDING", "CANCELLED", "RECONCILIATION"] },
    },
    select: { id: true },
  });
  if (unresolved) {
    return { ok: false, error: "Resolve existing Stripe payment attempts before connecting or changing accounts." };
  }

  const state = randomBytes(32).toString("base64url");
  await client.stripeConnectOAuthState.create({
    data: {
      stateHash: stateDigest(state),
      storeId,
      actorUserId,
      mode,
      expiresAt: new Date(Date.now() + OAUTH_STATE_TTL_MS),
    },
  });
  const authorizationUrl = new URL("https://connect.stripe.com/oauth/authorize");
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("client_id", config.clientId);
  authorizationUrl.searchParams.set("scope", "read_write");
  authorizationUrl.searchParams.set("redirect_uri", config.redirectUri);
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("stripe_user[country]", store.countryCode);
  return { ok: true, url: authorizationUrl.toString() };
}

async function consumeOAuthState(client: PrismaClient, state: unknown) {
  if (typeof state !== "string" || !/^[A-Za-z0-9_-]{40,50}$/.test(state)) return null;
  const stateHash = stateDigest(state);
  return client.$transaction(async (tx) => {
    const pending = await tx.stripeConnectOAuthState.findUnique({
      where: { stateHash },
      select: { id: true, storeId: true, actorUserId: true, mode: true, expiresAt: true, consumedAt: true },
    });
    if (!pending || pending.consumedAt || pending.expiresAt <= new Date()) return null;
    const consumed = await tx.stripeConnectOAuthState.updateMany({
      where: { id: pending.id, stateHash, consumedAt: null, expiresAt: { gt: new Date() } },
      data: { consumedAt: new Date() },
    });
    return consumed.count === 1 ? pending : null;
  });
}

export async function consumeStripeConnectOAuthError(
  client: PrismaClient,
  state: unknown,
): Promise<{ storeId: string; actorUserId: string } | null> {
  const consumed = await consumeOAuthState(client, state);
  return consumed ? { storeId: consumed.storeId, actorUserId: consumed.actorUserId } : null;
}

interface StripeOAuthToken {
  stripe_user_id?: string;
  livemode?: boolean;
  scope?: string;
}

async function exchangeCode(mode: StripeMode, code: string): Promise<string | null> {
  const config = oauthConfiguration(mode);
  if (!config) return null;
  let response: Response;
  try {
    response = await fetch("https://connect.stripe.com/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.apiKey}:`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ grant_type: "authorization_code", code }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;
  let token: StripeOAuthToken;
  try {
    token = await response.json() as StripeOAuthToken;
  } catch {
    return null;
  }
  if (
    typeof token.stripe_user_id !== "string" ||
    !/^acct_[A-Za-z0-9]+$/.test(token.stripe_user_id) ||
    token.livemode !== (mode === "LIVE") ||
    token.scope !== "read_write"
  ) return null;
  return token.stripe_user_id;
}

export async function completeStripeConnectOAuth(
  client: PrismaClient,
  stateValue: unknown,
  codeValue: unknown,
): Promise<{ ok: true; storeSlug: string } | { ok: false; storeSlug?: string }> {
  if (typeof codeValue !== "string" || codeValue.length < 1 || codeValue.length > 2048) return { ok: false };
  const state = await consumeOAuthState(client, stateValue);
  if (!state) return { ok: false };
  const store = await client.store.findUnique({ where: { id: state.storeId }, select: { slug: true } });
  if (!store) return { ok: false };
  const stripeAccountId = await exchangeCode(state.mode, codeValue);
  if (!stripeAccountId) return { ok: false, storeSlug: store.slug };

  try {
    const storeSlug = await client.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Store" WHERE "id" = ${state.storeId} FOR UPDATE`;
      const store = await tx.store.findFirst({
        where: { id: state.storeId, status: "ACTIVE", archivedAt: null },
        select: { id: true, slug: true, countryCode: true, baseCurrency: true },
      });
      const owner = await tx.storeMembership.findFirst({
        where: { storeId: state.storeId, userId: state.actorUserId, role: "OWNER", user: { disabledAt: null } },
        select: { userId: true },
      });
      if (
        !store ||
        !owner ||
        !isProviderMarketSupported("stripe_connect", store.countryCode, store.baseCurrency)
      ) throw new Error("Stripe connection context is no longer valid.");

      const unresolved = await tx.paymentTransaction.findFirst({
        where: {
          storeId: state.storeId,
          providerAccount: { is: { provider: "stripe_connect" } },
          status: { in: ["PENDING", "CANCELLED", "RECONCILIATION"] },
        },
        select: { id: true },
      });
      if (unresolved) throw new Error("Stripe payment attempts must be resolved before account changes.");

      const otherStoreAccount = await tx.paymentProviderAccount.findFirst({
        where: {
          provider: "stripe_connect",
          stripeAccountId,
          mode: state.mode,
          storeId: { not: state.storeId },
        },
        select: { id: true },
      });
      if (otherStoreAccount) throw new Error("This Stripe account is already connected to another store.");

      await tx.paymentProviderAccount.updateMany({
        where: { storeId: state.storeId, provider: "stripe_connect" },
        data: { enabled: false },
      });
      const priorAccount = await tx.paymentProviderAccount.findFirst({
        where: { storeId: state.storeId, provider: "stripe_connect", stripeAccountId, mode: state.mode },
        select: { id: true },
      });
      const account = priorAccount
        ? await tx.paymentProviderAccount.update({
            where: { id: priorAccount.id },
            data: {
              enabled: true,
              publicConfig: { accountId: stripeAccountId },
              secretRef: `vault:${state.storeId}/stripe/platform-${state.mode.toLowerCase()}`,
            },
            select: { id: true },
          })
        : await tx.paymentProviderAccount.create({
            data: {
              storeId: state.storeId,
              provider: "stripe_connect",
              stripeAccountId,
              displayName: "Stripe Connect",
              mode: state.mode,
              enabled: true,
              publicConfig: { accountId: stripeAccountId },
              secretRef: `vault:${state.storeId}/stripe/platform-${state.mode.toLowerCase()}`,
            },
            select: { id: true },
          });
      await tx.storePaymentMethod.upsert({
        where: { storeId_method: { storeId: state.storeId, method: "stripe_checkout" } },
        create: {
          storeId: state.storeId,
          method: "stripe_checkout",
          enabled: false,
          providerAccountId: account.id,
        },
        update: { enabled: false, providerAccountId: account.id },
      });
      await recordAudit(tx, {
        action: "payment.stripe_connect_account",
        actorUserId: state.actorUserId,
        storeId: state.storeId,
        targetType: "payment_provider_account",
        targetId: account.id,
        metadata: { stripeAccountId, mode: state.mode },
      });
      return store.slug;
    });
    return { ok: true, storeSlug };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, storeSlug: store.slug };
    }
    throw error;
  }
}

export async function stripeConnectOwnerSettingsUrlForStore(
  client: PrismaClient,
  storeId: string,
): Promise<string | null> {
  const store = await client.store.findUnique({ where: { id: storeId }, select: { slug: true } });
  return store ? stripeConnectOwnerSettingsUrl(store.slug) : null;
}

export function stripeConnectOwnerSettingsUrl(storeSlug: string): string | null {
  const baseUrl = process.env.BETTER_AUTH_URL;
  if (!baseUrl) return null;
  const url = storeAdminUrlForSlug(storeSlug, baseUrl, storeHostConfig());
  if (!url) return null;
  const result = new URL(url);
  result.pathname = "/admin/settings";
  result.search = "";
  return result.toString();
}
