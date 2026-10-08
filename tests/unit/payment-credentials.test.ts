import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { isSecretReference, isStoreProviderSecretReference } from "../../lib/payments/rules";
import { validateOwnerPaymentSettings } from "../../lib/payments/validation";
import {
  configurePaymentSecretStore,
  createPaymentCredentialResolver,
  paymentCredentialsAvailable,
  resolvePaymentCredentials,
  runtimePaymentCredentialResolver,
} from "../../lib/server/payments/credentials";
import { isOnlinePaymentMethodAvailable } from "../../lib/server/payments/methods";
import {
  createEnvironmentPaymentSecretStore,
  paymentSecretEnvironmentVariable,
} from "../../lib/server/payments/environment-secret-store";
import type {
  PaymentCredentialContext,
  PaymentSecretStore,
} from "../../lib/server/payments/types";

const stripeReference = "vault:store-a/stripe/account-123";
const jazzcashReference = "vault:store-a/jazzcash/merchant-456";
const liveStripeReference = "vault:store-a/stripe/live-account";

const fixtures: Record<string, Readonly<Record<string, string>>> = {
  [stripeReference]: {
    apiSecretKey: "sk_test_fake_store_a_only",
    webhookSigningSecret: "whsec_fake_store_a_only",
  },
  [liveStripeReference]: {
    apiSecretKey: "sk_live_fake_store_a_only",
    webhookSigningSecret: "whsec_fake_store_a_live",
  },
  [jazzcashReference]: {
    merchantId: "FAKE-MERCHANT-A",
    merchantPassword: "fake-store-a-jazzcash-password",
  },
  "vault:store-b/stripe/account-789": {
    apiSecretKey: "sk_test_fake_store_b_only",
    webhookSigningSecret: "whsec_fake_store_b_only",
  },
  "vault:store-b/jazzcash/merchant-987": {
    merchantId: "FAKE-MERCHANT-B",
    merchantPassword: "fake-store-b-jazzcash-password",
  },
};

const fixtureSecretStore: PaymentSecretStore = {
  async resolve(context) {
    const expectedPath = `vault:${context.storeId}/${context.provider === "stripe_connect" ? "stripe" : context.provider}/`;
    if (!context.secretRef.startsWith(expectedPath)) return null;
    return fixtures[context.secretRef] ?? null;
  },
};

const stripeContext: PaymentCredentialContext = {
  secretRef: stripeReference,
  provider: "stripe_connect",
  storeId: "store-a",
  providerAccountId: "stripe-account-a",
  mode: "TEST",
  connectedAccountId: "acct_12345678",
};

const jazzcashContext: PaymentCredentialContext = {
  secretRef: jazzcashReference,
  provider: "jazzcash",
  storeId: "store-a",
  providerAccountId: "jazzcash-account-a",
  mode: "TEST",
};

test("external secret-store adapter resolves scoped fake Stripe and JazzCash credentials", async () => {
  const resolver = createPaymentCredentialResolver(fixtureSecretStore);
  const stripe = await resolvePaymentCredentials(resolver, stripeContext);
  const jazzcash = await resolvePaymentCredentials(resolver, jazzcashContext);

  assert.equal(stripe?.secrets.apiSecretKey, "sk_test_fake_store_a_only");
  assert.equal(stripe?.secrets.webhookSigningSecret, "whsec_fake_store_a_only");
  assert.equal(jazzcash?.secrets.merchantPassword, "fake-store-a-jazzcash-password");
  assert.equal(stripe?.provider, "stripe_connect");
  assert.equal(jazzcash?.provider, "jazzcash");
});

test("Stripe API credentials are strictly separated by TEST and LIVE mode", async () => {
  const resolver = createPaymentCredentialResolver(fixtureSecretStore);
  const liveContext: PaymentCredentialContext = {
    ...stripeContext,
    secretRef: liveStripeReference,
    mode: "LIVE",
  };
  assert.equal((await resolver.resolve(stripeContext))?.secrets.apiSecretKey.startsWith("sk_test_"), true);
  assert.equal((await resolver.resolve(liveContext))?.secrets.apiSecretKey.startsWith("sk_live_"), true);
  assert.equal(await resolver.resolve({ ...stripeContext, mode: "LIVE" }), null);
  assert.equal(await resolver.resolve({ ...liveContext, mode: "TEST" }), null);
});

test("environment secret records require exact provider, store, account, mode and Connect-account scope", async () => {
  const context = { ...stripeContext, secretRef: "vault:store-a/stripe/live", mode: "LIVE" as const };
  const record = JSON.stringify({
      provider: "stripe_connect",
      storeId: "store-a",
      providerAccountId: "stripe-account-a",
      mode: "LIVE",
      connectedAccountId: "acct_12345678",
      secrets: { apiSecretKey: "sk_live_fake", webhookSigningSecret: "whsec_fake" },
    });
  const store = createEnvironmentPaymentSecretStore((name) =>
    name === paymentSecretEnvironmentVariable(context.secretRef) ? record : undefined,
  );
  const credentials = await createPaymentCredentialResolver(store).resolve(context);
  assert.equal(credentials?.secrets.apiSecretKey, "sk_live_fake");
  assert.equal(
    await createPaymentCredentialResolver(store).resolve({ ...context, providerAccountId: "stripe-account-b" }),
    null,
  );
  assert.equal(
    await createPaymentCredentialResolver(store).resolve({ ...context, connectedAccountId: "acct_87654321" }),
    null,
  );
});

test("online Stripe availability uses only the matching store account and reference", async () => {
  const account = {
    id: "stripe-account-a",
    storeId: "store-a",
    provider: "stripe_connect",
    mode: "TEST" as const,
    enabled: true,
    publicConfig: { accountId: "acct_12345678" },
    secretRef: stripeReference,
  };
  const resolver = createPaymentCredentialResolver(fixtureSecretStore);

  assert.equal(
    await isOnlinePaymentMethodAvailable(
      "stripe_checkout",
      account,
      { id: "store-a", countryCode: "AE", currency: "AED" },
      resolver,
    ),
    true,
  );
  assert.equal(
    await isOnlinePaymentMethodAvailable(
      "stripe_checkout",
      account,
      { id: "store-b", countryCode: "AE", currency: "AED" },
      resolver,
    ),
    false,
  );
});

test("LIVE Stripe availability stays disabled unless deployment explicitly enables the live-checkout gate", async () => {
  const previousFlag = process.env.STRIPE_LIVE_CHECKOUT_ENABLED;
  delete process.env.STRIPE_LIVE_CHECKOUT_ENABLED;
  const account = {
    id: "stripe-account-a",
    storeId: "store-a",
    provider: "stripe_connect",
    mode: "LIVE" as const,
    enabled: true,
    publicConfig: { accountId: "acct_12345678" },
    secretRef: liveStripeReference,
  };
  try {
    const resolver = createPaymentCredentialResolver(fixtureSecretStore);
    assert.equal(
      await isOnlinePaymentMethodAvailable(
        "stripe_checkout",
        account,
        { id: "store-a", countryCode: "AE", currency: "AED" },
        resolver,
      ),
      false,
    );
    process.env.STRIPE_LIVE_CHECKOUT_ENABLED = "true";
    assert.equal(
      await isOnlinePaymentMethodAvailable(
        "stripe_checkout",
        account,
        { id: "store-a", countryCode: "AE", currency: "AED" },
        resolver,
      ),
      true,
    );
  } finally {
    if (previousFlag === undefined) delete process.env.STRIPE_LIVE_CHECKOUT_ENABLED;
    else process.env.STRIPE_LIVE_CHECKOUT_ENABLED = previousFlag;
  }
});

test("store A references cannot resolve against store B or another provider", async () => {
  const resolver = createPaymentCredentialResolver(fixtureSecretStore);
  const wrongStore = { ...stripeContext, storeId: "store-b" };
  const wrongStripeProvider = { ...stripeContext, provider: "jazzcash" as const };
  const wrongJazzcashProvider = { ...jazzcashContext, provider: "stripe_connect" as const };

  assert.equal(await resolver.resolve(wrongStore), null);
  assert.equal(await resolver.resolve(wrongStripeProvider), null);
  assert.equal(await resolver.resolve(wrongJazzcashProvider), null);
  assert.equal(await isStoreProviderSecretReference(stripeReference, "store-b", "stripe_connect"), false);
  assert.equal(await isStoreProviderSecretReference(jazzcashReference, "store-a", "stripe_connect"), false);
});

test("Store Owner settings accept only an opaque reference scoped to that store and Stripe", () => {
  const input = {
    paymentMethods: {},
    bankTransfer: {},
    stripe: {
      enabled: true,
      accountId: "acct_12345678",
      secretRef: stripeReference,
    },
  };
  assert.equal(
    validateOwnerPaymentSettings(input, "AE", "AED", "store-a").errors.stripeSecretRef,
    undefined,
  );
  assert.ok(
    validateOwnerPaymentSettings(
      { ...input, stripe: { ...input.stripe, secretRef: "vault:store-b/stripe/account-789" } },
      "AE",
      "AED",
      "store-a",
    ).errors.stripeSecretRef,
  );
  assert.ok(
    validateOwnerPaymentSettings(
      { ...input, stripe: { ...input.stripe, secretRef: "sk_test_raw_credential" } },
      "AE",
      "AED",
      "store-a",
    ).errors.stripeSecretRef,
  );
});

test("Store Owner JazzCash settings require Pakistan, merchant metadata, and a same-store reference", () => {
  const input = {
    paymentMethods: {},
    bankTransfer: {},
    stripe: {},
    jazzcash: {
      enabled: true,
      merchantId: "FAKE-MERCHANT-A",
      secretRef: jazzcashReference,
    },
  };
  assert.deepEqual(validateOwnerPaymentSettings(input, "PK", "PKR", "store-a").errors, {});
  assert.ok(
    validateOwnerPaymentSettings(input, "PK", "PKR", "store-b").errors.jazzcashSecretRef,
  );
  assert.ok(
    validateOwnerPaymentSettings(input, "AE", "AED", "store-a").errors.jazzcash,
  );
});

test("malformed, raw-secret, unknown-provider, and unavailable references fail closed", async () => {
  const resolver = createPaymentCredentialResolver(fixtureSecretStore);
  assert.equal(isSecretReference("vault:store-a/stripe/account-123"), true);
  assert.equal(isSecretReference("sk_test_not-a-reference"), false);
  assert.equal(await resolver.resolve({ ...stripeContext, secretRef: "vault:store-b/stripe/account-789" }), null);
  assert.equal(await resolver.resolve({ ...stripeContext, secretRef: "vault:store-a/easypaisa/key" }), null);
  assert.equal(
    await resolver.resolve({ ...stripeContext, provider: "easypaisa" as PaymentCredentialContext["provider"] }),
    null,
  );

  const unavailable = createPaymentCredentialResolver({
    async resolve() {
      return null;
    },
  });
  assert.equal(await paymentCredentialsAvailable(unavailable, stripeContext), false);
  assert.equal(await resolvePaymentCredentials(unavailable, stripeContext), null);
});

test("provider credential records reject credentials belonging to the other provider", async () => {
  const stripeWithJazzcashData = createPaymentCredentialResolver({
    async resolve() {
      return {
        apiSecretKey: "sk_test_fake_store_a_only",
        webhookSigningSecret: "whsec_fake_store_a_only",
        merchantPassword: "fake-jazzcash-password",
      };
    },
  });
  const jazzcashWithStripeData = createPaymentCredentialResolver({
    async resolve() {
      return {
        merchantPassword: "fake-store-a-jazzcash-password",
        apiSecretKey: "sk_test_fake_store_a_only",
      };
    },
  });

  assert.equal(await stripeWithJazzcashData.resolve(stripeContext), null);
  assert.equal(await jazzcashWithStripeData.resolve(jazzcashContext), null);
});

test("runtime resolver uses only an explicitly installed server-side adapter and fails closed otherwise", async () => {
  configurePaymentSecretStore(null);
  assert.equal(await runtimePaymentCredentialResolver.resolve(stripeContext), null);

  configurePaymentSecretStore(fixtureSecretStore);
  try {
    const resolved = await runtimePaymentCredentialResolver.resolve(stripeContext);
    assert.equal(resolved?.storeId, "store-a");
    assert.equal(resolved?.providerAccountId, "stripe-account-a");
  } finally {
    configurePaymentSecretStore(null);
  }
  assert.equal(await runtimePaymentCredentialResolver.resolve(stripeContext), null);
});

test("resolver and secret fields are server-only and absent from the Store Owner client form", () => {
  const resolverSource = readFileSync("lib/server/payments/credentials.ts", "utf8");
  const settingsClientSource = readFileSync("components/admin/StorePaymentSettingsForm.tsx", "utf8");

  assert.match(resolverSource, /^import ["']server-only["'];/);
  assert.doesNotMatch(settingsClientSource, /apiSecretKey|webhookSigningSecret|merchantPassword|sharedSecret/);
});
