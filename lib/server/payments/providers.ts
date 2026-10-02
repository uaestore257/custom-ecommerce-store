import "server-only";
import { jazzcashAdapter } from "./jazzcash";
import { stripeConnectAdapter } from "./stripe";
import type { PaymentProviderAdapter, PaymentProviderId } from "./types";

const adapters: Partial<Record<PaymentProviderId, PaymentProviderAdapter>> = {
  stripe_connect: stripeConnectAdapter,
  jazzcash: jazzcashAdapter,
};

export function paymentProviderAdapter(provider: string): PaymentProviderAdapter | null {
  return adapters[provider as PaymentProviderId] ?? null;
}

export function isPendingPaymentProvider(provider: string): boolean {
  return provider === "jazzcash" || provider === "easypaisa";
}
