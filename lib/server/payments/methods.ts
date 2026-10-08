import "server-only";
import { isProviderMarketSupported, paymentProviderForMethod } from "@/lib/payments/rules";
import { liveStripeCheckoutEnabled, paymentCredentialsAvailable, runtimePaymentCredentialResolver } from "./credentials";
import { paymentProviderAdapter } from "./providers";
import type { PaymentCredentialResolver, PaymentProviderAccountConfig } from "./types";
import type { PaymentMethodId } from "@/lib/types";

export async function isOnlinePaymentMethodAvailable(
  method: PaymentMethodId,
  account: PaymentProviderAccountConfig | null | undefined,
  store: { id: string; countryCode: string; currency: string },
  resolver: PaymentCredentialResolver = runtimePaymentCredentialResolver,
): Promise<boolean> {
  const provider = paymentProviderForMethod(method);
  if (
    !provider ||
    !account ||
    account.storeId !== store.id ||
    account.provider !== provider ||
    (provider === "jazzcash" && account.mode !== "TEST") ||
    !account.enabled ||
    !account.secretRef ||
    !paymentProviderAdapter(provider) ||
    !isProviderMarketSupported(provider, store.countryCode, store.currency)
  ) {
    return false;
  }
  // JazzCash's current browser-post flow includes the merchant password in its form payload.
  if (provider === "jazzcash") return false;
  if (account.mode === "LIVE" && !liveStripeCheckoutEnabled()) return false;
  const config =
    account.publicConfig && typeof account.publicConfig === "object" && !Array.isArray(account.publicConfig)
      ? (account.publicConfig as Record<string, unknown>)
      : {};
  if (typeof config.accountId !== "string") return false;
  return paymentCredentialsAvailable(resolver, {
    secretRef: account.secretRef,
    provider,
    storeId: store.id,
    providerAccountId: account.id,
    mode: account.mode,
    connectedAccountId: config.accountId,
  });
}

export function bankTransferConfigurationIsValid(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.bankName === "string" &&
    record.bankName.trim().length > 0 &&
    typeof record.accountName === "string" &&
    record.accountName.trim().length > 0 &&
    (typeof record.accountNumber === "string" && record.accountNumber.trim().length > 0 ||
      typeof record.iban === "string" && record.iban.trim().length > 0)
  );
}
