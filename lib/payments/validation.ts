import {
  isProviderMarketSupported,
  isSecretReference,
  isStripeConnectedAccountId,
  isStoreProviderSecretReference,
} from "./rules";

export interface CleanOwnerPaymentSettings {
  paymentMethods: {
    cash_on_delivery: boolean;
    card_on_delivery: boolean;
    bank_transfer: boolean;
    cash_on_pickup: boolean;
  };
  bankTransfer: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    iban: string;
    swiftCode: string;
    instructions: string;
  };
  stripe: {
    enabled: boolean;
    accountId: string;
    secretRef: string;
  };
  jazzcash: {
    enabled: boolean;
    merchantId: string;
    secretRef: string;
  };
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return "";
  const normalized = value.trim();
  return normalized.length <= max ? normalized : null;
}

function enabled(value: unknown) {
  return value === true;
}

export function validateOwnerPaymentSettings(input: unknown, country: string, currency: string, storeId?: string) {
  const raw = record(input);
  const methods = record(raw.paymentMethods);
  const bank = record(raw.bankTransfer);
  const stripe = record(raw.stripe);
  const jazzcash = record(raw.jazzcash);
  const errors: Record<string, string> = {};

  const fields = {
    bankName: text(bank.bankName, 100),
    accountName: text(bank.accountName, 100),
    accountNumber: text(bank.accountNumber, 80),
    iban: text(bank.iban, 80),
    swiftCode: text(bank.swiftCode, 30),
    instructions: text(bank.instructions, 500),
    stripeAccountId: text(stripe.accountId, 80),
    stripeSecretRef: text(stripe.secretRef, 512),
    jazzcashMerchantId: text(jazzcash.merchantId, 80),
    jazzcashSecretRef: text(jazzcash.secretRef, 512),
  };
  for (const [field, value] of Object.entries(fields)) {
    if (value === null) errors[field] = "Keep this value within the allowed length.";
  }

  const values: CleanOwnerPaymentSettings = {
    paymentMethods: {
      cash_on_delivery: enabled(methods.cash_on_delivery),
      card_on_delivery: enabled(methods.card_on_delivery),
      bank_transfer: enabled(methods.bank_transfer),
      cash_on_pickup: enabled(methods.cash_on_pickup),
    },
    bankTransfer: {
      bankName: fields.bankName ?? "",
      accountName: fields.accountName ?? "",
      accountNumber: fields.accountNumber ?? "",
      iban: fields.iban ?? "",
      swiftCode: fields.swiftCode ?? "",
      instructions: fields.instructions ?? "",
    },
    stripe: {
      enabled: enabled(stripe.enabled),
      accountId: fields.stripeAccountId ?? "",
      secretRef: fields.stripeSecretRef ?? "",
    },
    jazzcash: {
      enabled: enabled(jazzcash.enabled),
      merchantId: fields.jazzcashMerchantId ?? "",
      secretRef: fields.jazzcashSecretRef ?? "",
    },
  };

  if (values.paymentMethods.bank_transfer) {
    if (!values.bankTransfer.bankName) errors.bankName = "Enter the bank name.";
    if (!values.bankTransfer.accountName) errors.accountName = "Enter the account holder name.";
    if (!values.bankTransfer.accountNumber && !values.bankTransfer.iban) {
      errors.accountNumber = "Enter an account number or IBAN.";
    }
  }
  if (values.stripe.enabled) {
    if (!isProviderMarketSupported("stripe_connect", country, currency)) {
      errors.stripe = "Stripe Checkout is available only for UAE stores using AED.";
    }
    if (!isStripeConnectedAccountId(values.stripe.accountId)) {
      errors.stripeAccountId = "Enter the connected Stripe account ID.";
    }
    if (
      values.stripe.secretRef &&
      (!isSecretReference(values.stripe.secretRef) ||
        (storeId !== undefined && !isStoreProviderSecretReference(values.stripe.secretRef, storeId, "stripe_connect")))
    ) {
      errors.stripeSecretRef = "Enter an opaque secret-manager reference, not a credential.";
    }
    if (!values.stripe.secretRef) errors.stripeSecretRef = "Enter the reference to this store's Stripe test credentials.";
  } else if (values.stripe.accountId && !isStripeConnectedAccountId(values.stripe.accountId)) {
    errors.stripeAccountId = "Enter the connected Stripe account ID.";
  } else if (
    values.stripe.secretRef &&
    (!isSecretReference(values.stripe.secretRef) ||
      (storeId !== undefined && !isStoreProviderSecretReference(values.stripe.secretRef, storeId, "stripe_connect")))
  ) {
    errors.stripeSecretRef = "Enter an opaque secret-manager reference, not a credential.";
  }

  if (values.jazzcash.enabled) {
    if (!isProviderMarketSupported("jazzcash", country, currency)) {
      errors.jazzcash = "JazzCash is available only for Pakistan stores using PKR.";
    }
    if (!values.jazzcash.merchantId) errors.jazzcashMerchantId = "Enter this store's JazzCash merchant ID.";
    if (
      !isSecretReference(values.jazzcash.secretRef) ||
      (storeId !== undefined && !isStoreProviderSecretReference(values.jazzcash.secretRef, storeId, "jazzcash"))
    ) {
      errors.jazzcashSecretRef = "Enter an opaque JazzCash secret-manager reference for this store.";
    }
  } else {
    if (
      values.jazzcash.secretRef &&
      (!isSecretReference(values.jazzcash.secretRef) ||
        (storeId !== undefined && !isStoreProviderSecretReference(values.jazzcash.secretRef, storeId, "jazzcash")))
    ) {
      errors.jazzcashSecretRef = "Enter an opaque JazzCash secret-manager reference for this store.";
    }
    if (values.jazzcash.merchantId && !isProviderMarketSupported("jazzcash", country, currency)) {
      errors.jazzcash = "JazzCash is available only for Pakistan stores using PKR.";
    }
  }

  return { values, errors };
}
