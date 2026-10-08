import "server-only";
import type {
  PaymentCredentialContext,
  PaymentCredentialResolver,
  PaymentSecretStore,
  ResolvedPaymentCredentials,
} from "./types";
import { isStoreProviderSecretReference } from "@/lib/payments/rules";

type RuntimeWithPaymentSecretStore = typeof globalThis & {
  __storeScopedPaymentSecretStore?: PaymentSecretStore;
};

function runtimeSecretStore(): PaymentSecretStore | null {
  return (globalThis as RuntimeWithPaymentSecretStore).__storeScopedPaymentSecretStore ?? null;
}

/**
 * Install the server-side adapter supplied by deployment infrastructure.
 * No local or environment-variable secret store is provided by this app.
 */
export function configurePaymentSecretStore(secretStore: PaymentSecretStore | null): void {
  const runtime = globalThis as RuntimeWithPaymentSecretStore;
  if (secretStore) runtime.__storeScopedPaymentSecretStore = secretStore;
  else delete runtime.__storeScopedPaymentSecretStore;
}

export function liveStripeCheckoutEnabled(): boolean {
  return process.env.STRIPE_LIVE_CHECKOUT_ENABLED === "true";
}

function validProviderCredentialShape(
  provider: PaymentCredentialContext["provider"],
  secrets: Readonly<Record<string, string>>,
  mode?: PaymentCredentialContext["mode"],
): boolean {
  if (!secrets || typeof secrets !== "object" || Array.isArray(secrets)) return false;
  if (Object.values(secrets).some((value) => typeof value !== "string" || !value.trim())) return false;
  if (provider === "stripe_connect") {
    const keyPrefix = mode === "LIVE" ? "sk_live_" : "sk_test_";
    return Object.keys(secrets).every((key) => ["apiSecretKey", "webhookSigningSecret"].includes(key)) &&
      secrets.apiSecretKey?.startsWith(keyPrefix) === true &&
      secrets.webhookSigningSecret?.startsWith("whsec_") === true;
  }
  if (
    !Object.keys(secrets).every((key) =>
      ["merchantId", "merchantPassword", "password", "jazzcashPassword", "sharedSecret"].includes(key),
    )
  ) {
    return false;
  }
  return Boolean(
    secrets.merchantPassword?.trim() ||
    secrets.password?.trim() ||
    secrets.jazzcashPassword?.trim() ||
    secrets.sharedSecret?.trim(),
  );
}

/** Build an isolated resolver around an external secret-manager adapter. */
export function createPaymentCredentialResolver(secretStore: PaymentSecretStore): PaymentCredentialResolver {
  async function resolve(context: PaymentCredentialContext): Promise<ResolvedPaymentCredentials | null> {
    if (!isStoreProviderSecretReference(context.secretRef, context.storeId, context.provider)) return null;

    let secrets: Readonly<Record<string, string>> | null;
    try {
      secrets = await secretStore.resolve(context);
    } catch {
      return null;
    }
    if (!secrets || !validProviderCredentialShape(context.provider, secrets, context.mode)) return null;

    return {
      ...context,
      secrets: Object.freeze({ ...secrets }),
    };
  }

  return {
    async isAvailable(context) {
      return (await resolve(context)) !== null;
    },
    resolve,
  };
}

/** Production default: resolves only through the explicitly installed external adapter. */
export const runtimePaymentCredentialResolver: PaymentCredentialResolver = {
  async isAvailable(context) {
    const secretStore = runtimeSecretStore();
    return secretStore ? createPaymentCredentialResolver(secretStore).isAvailable(context) : false;
  },
  async resolve(context) {
    const secretStore = runtimeSecretStore();
    return secretStore ? createPaymentCredentialResolver(secretStore).resolve(context) : null;
  },
};

/** Explicit fail-closed resolver for code paths that must never access a secret store. */
export const unavailablePaymentCredentialResolver: PaymentCredentialResolver = {
  async isAvailable() {
    return false;
  },
  async resolve() {
    return null;
  },
};

export async function resolvePaymentCredentials(
  resolver: PaymentCredentialResolver,
  context: PaymentCredentialContext,
): Promise<ResolvedPaymentCredentials | null> {
  let resolved: ResolvedPaymentCredentials | null;
  try {
    resolved = await resolver.resolve(context);
  } catch {
    return null;
  }
  if (
    !resolved ||
    !isStoreProviderSecretReference(context.secretRef, context.storeId, context.provider) ||
    resolved.secretRef !== context.secretRef ||
    resolved.provider !== context.provider ||
    resolved.storeId !== context.storeId ||
    resolved.providerAccountId !== context.providerAccountId ||
    resolved.mode !== context.mode ||
    resolved.connectedAccountId !== context.connectedAccountId ||
    !validProviderCredentialShape(context.provider, resolved.secrets, context.mode)
  ) {
    return null;
  }
  return resolved;
}

export async function paymentCredentialsAvailable(
  resolver: PaymentCredentialResolver,
  context: PaymentCredentialContext,
): Promise<boolean> {
  try {
    return await resolver.isAvailable(context);
  } catch {
    return false;
  }
}
