import "server-only";
import { createHash } from "node:crypto";
import type { PaymentCredentialContext, PaymentSecretStore } from "./types";

interface SecretRecord {
  provider: string;
  storeId: string;
  providerAccountId: string;
  mode: "TEST" | "LIVE";
  connectedAccountId?: string;
  secrets: Record<string, string>;
}

/**
 * Deployment environment-secret bridge. Each opaque reference maps to one
 * protected server environment variable; values are never logged or returned
 * to a client.
 */
export function paymentSecretEnvironmentVariable(secretRef: string): string {
  const digest = createHash("sha256").update(secretRef).digest("hex").toUpperCase();
  return `PAYMENT_SECRET_${digest}`;
}

export function createEnvironmentPaymentSecretStore(
  read: (variableName: string) => string | undefined = (variableName) => process.env[variableName],
): PaymentSecretStore {
  return {
    async resolve(context: PaymentCredentialContext) {
      if (context.provider !== "stripe_connect") return null;
      const raw = read(paymentSecretEnvironmentVariable(context.secretRef));
      if (!raw || raw.length > 16_384 || !context.mode) return null;
      if (!context.connectedAccountId) return null;
      let candidate: unknown;
      try {
        candidate = JSON.parse(raw);
      } catch {
        return null;
      }
      if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
      const record = candidate as Partial<SecretRecord>;
      if (
        record.provider !== context.provider ||
        record.storeId !== context.storeId ||
        record.providerAccountId !== context.providerAccountId ||
        record.mode !== context.mode ||
        record.connectedAccountId !== context.connectedAccountId ||
        !record.secrets ||
        typeof record.secrets !== "object" ||
        Array.isArray(record.secrets)
      ) {
        return null;
      }
      return record.secrets;
    },
  };
}
