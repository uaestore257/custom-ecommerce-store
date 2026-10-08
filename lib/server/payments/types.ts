import type { PaymentMethodId } from "@/lib/types";

export const PAYMENT_PROVIDER_IDS = ["stripe_connect", "jazzcash", "easypaisa"] as const;
export type PaymentProviderId = (typeof PAYMENT_PROVIDER_IDS)[number];
export type ConfigurablePaymentProviderId = "stripe_connect";

export interface PaymentProviderAccountConfig {
  id: string;
  storeId: string;
  provider: string;
  mode: "TEST" | "LIVE";
  enabled: boolean;
  publicConfig: unknown;
  secretRef: string | null;
}

export interface PaymentCredentialContext {
  secretRef: string;
  provider: PaymentProviderId;
  storeId: string;
  providerAccountId: string;
  mode?: "TEST" | "LIVE";
  connectedAccountId?: string;
}

export interface ResolvedPaymentCredentials extends PaymentCredentialContext {
  secrets: Readonly<Record<string, string>>;
}

export interface PaymentCredentialResolver {
  isAvailable(context: PaymentCredentialContext): Promise<boolean>;
  resolve(context: PaymentCredentialContext): Promise<ResolvedPaymentCredentials | null>;
}

/** Adapter boundary for a real external secret manager; never persist returned values. */
export interface PaymentSecretStore {
  resolve(context: PaymentCredentialContext): Promise<Readonly<Record<string, string>> | null>;
}

export interface ProviderCheckoutInput {
  storeId: string;
  providerAccountId: string;
  transactionId: string;
  checkoutAttempt: number;
  orderId: string;
  orderNumber: string;
  amountMinor: bigint;
  currency: string;
  storeOrigin: string;
  publicConfig: Record<string, unknown>;
}

export interface ProviderCheckoutSession {
  providerReference: string;
  redirect:
    | { kind: "redirect"; url: string }
    | { kind: "post"; action: string; fields: Record<string, string> };
}

export interface ProviderRefundEvidence {
  providerRefundId: string;
  amountMinor: bigint;
  currency: string;
}

export interface VerifiedPaymentEvent {
  eventId: string;
  eventType: string;
  paymentTransactionId: string;
  storeId?: string;
  orderId?: string;
  transactionReference: string;
  amountMinor: bigint;
  currency: string;
  outcome: "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
}

export interface PaymentProviderAdapter {
  readonly id: PaymentProviderId;
  readonly method: PaymentMethodId;
  createCheckout(
    input: ProviderCheckoutInput,
    credentials: ResolvedPaymentCredentials,
  ): Promise<ProviderCheckoutSession>;
  verifyReturn?(
    input: ProviderCheckoutInput,
    query: URLSearchParams,
    credentials: ResolvedPaymentCredentials,
  ): Promise<VerifiedPaymentEvent | null>;
  verifyWebhook?(
    rawBody: string,
    headers: Headers,
    credentials: ResolvedPaymentCredentials,
    accountId: string,
  ): Promise<VerifiedPaymentEvent | null>;
  recoverCheckout?(
    input: ProviderCheckoutInput,
    providerReference: string,
    credentials: ResolvedPaymentCredentials,
  ): Promise<ProviderCheckoutSession | "expired" | "missing" | "complete" | null>;
  verifyRefund?(
    input: ProviderCheckoutInput,
    providerReference: string,
    refundId: string,
    credentials: ResolvedPaymentCredentials,
  ): Promise<ProviderRefundEvidence | null>;
}

export type PendingPaymentProviderId = Exclude<PaymentProviderId, ConfigurablePaymentProviderId>;
