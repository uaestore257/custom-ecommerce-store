import "server-only";
import { isProviderMarketSupported, paymentProviderForMethod } from "@/lib/payments/rules";
import { paymentCredentialsAvailable, unavailablePaymentCredentialResolver } from "./credentials";
import { paymentProviderAdapter } from "./providers";
import type { PaymentCredentialResolver, PaymentProviderAccountConfig } from "./types";
import type { PaymentMethodId } from "@/lib/types";

export async function isOnlinePaymentMethodAvailable(
  method: PaymentMethodId,
  account: PaymentProviderAccountConfig | null | undefined,
  store: { id: string; countryCode: string; currency: string },
  resolver: PaymentCredentialResolver = unavailablePaymentCredentialResolver,
): Promise<boolean> {
  const provider = paymentProviderForMethod(method);
  if (
    !provider ||
    !account ||
    account.storeId !== store.id ||
    account.provider !== provider ||
    account.mode !== "TEST" ||
    !account.enabled ||
    !account.secretRef ||
    !paymentProviderAdapter(provider) ||
    !isProviderMarketSupported(provider, store.countryCode, store.currency)
  ) {
    return false;
  }
  return paymentCredentialsAvailable(resolver, {
    secretRef: account.secretRef,
    provider,
    storeId: store.id,
    providerAccountId: account.id,
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
