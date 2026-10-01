import type { PaymentMethodId } from "@/lib/types";
import type { PaymentProviderId } from "@/lib/server/payments/types";

export type ManualPaymentMethodId = "cash_on_delivery" | "bank_transfer" | "cash_on_pickup";
export type PaymentProviderMethodId = "stripe_checkout" | "jazzcash" | "easypaisa";

export const MANUAL_PAYMENT_METHODS: readonly ManualPaymentMethodId[] = [
  "cash_on_delivery",
  "bank_transfer",
  "cash_on_pickup",
];

export const PAYMENT_PROVIDER_METHODS: Record<PaymentProviderId, PaymentProviderMethodId> = {
  stripe_connect: "stripe_checkout",
  jazzcash: "jazzcash",
  easypaisa: "easypaisa",
};

const SUPPORTED_PROVIDER_MARKETS: Record<PaymentProviderId, { country: string; currency: string }> = {
  stripe_connect: { country: "AE", currency: "AED" },
  jazzcash: { country: "PK", currency: "PKR" },
  easypaisa: { country: "PK", currency: "PKR" },
};

export function isProviderMarketSupported(provider: string, country: string, currency: string): provider is PaymentProviderId {
  if (!(provider in SUPPORTED_PROVIDER_MARKETS)) return false;
  const supported = SUPPORTED_PROVIDER_MARKETS[provider as PaymentProviderId];
  return country === supported.country && currency === supported.currency;
}

export function paymentProviderForMethod(method: PaymentMethodId): PaymentProviderId | null {
  switch (method) {
    case "stripe_checkout":
      return "stripe_connect";
    case "jazzcash":
      return "jazzcash";
    case "easypaisa":
      return "easypaisa";
    default:
      return null;
  }
}

export function isSecretReference(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 512 &&
    /^(?:secret|vault|arn):[A-Za-z0-9][A-Za-z0-9._:/-]{0,506}$/.test(value)
  );
}

export function isStripeConnectedAccountId(value: unknown): value is string {
  return typeof value === "string" && /^acct_[A-Za-z0-9]{8,}$/.test(value);
}
