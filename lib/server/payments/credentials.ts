import "server-only";
import type {
  PaymentCredentialContext,
  PaymentCredentialResolver,
  ResolvedPaymentCredentials,
} from "./types";

/** No secret manager is configured in this checkout; provider use fails closed. */
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
    resolved.secretRef !== context.secretRef ||
    resolved.provider !== context.provider ||
    resolved.storeId !== context.storeId ||
    resolved.providerAccountId !== context.providerAccountId ||
    Object.values(resolved.secrets).some((value) => typeof value !== "string" || !value)
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
