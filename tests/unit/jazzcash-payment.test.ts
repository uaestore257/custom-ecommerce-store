import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildJazzcashSecureHash,
  jazzcashAdapter,
  mapJazzcashResponseCode,
  verifyJazzcashSecureHash,
} from "../../lib/server/payments/jazzcash";
import { isBrowserSafeProviderCheckout, isSecretReference } from "../../lib/payments/rules";
import { isOnlinePaymentMethodAvailable } from "../../lib/server/payments/methods";
import type {
  PaymentCredentialResolver,
  PaymentProviderAccountConfig,
  ProviderCheckoutInput,
  ResolvedPaymentCredentials,
} from "../../lib/server/payments/types";

const officialHash = "c7689cda7474eb1adcd343fd0c0b676bad0ba66361cc46db589bdb0da4c1c867";
const merchantPassword = "0F5DD14AE2";

const returnInput: ProviderCheckoutInput = {
  storeId: "store-a",
  providerAccountId: "acct-jazzcash",
  transactionId: "txn-store-a",
  orderId: "order-a",
  orderNumber: "A-100",
  amountMinor: 2995n,
  currency: "PKR",
  storeOrigin: "https://store-a.example.test",
  publicConfig: {},
};

const returnCredentials: ResolvedPaymentCredentials = {
  secretRef: "vault:store-a/jazzcash/test",
  provider: "jazzcash",
  storeId: "store-a",
  providerAccountId: "acct-jazzcash",
  secrets: { merchantPassword },
};

const resolver: PaymentCredentialResolver = {
  async isAvailable(context) {
    return context.storeId === "store-a" && context.provider === "jazzcash";
  },
  async resolve(context) {
    if (context.storeId !== "store-a" || context.provider !== "jazzcash") {
      return null;
    }
    return {
      ...context,
      secrets: {
        merchantId: "MER123",
        merchantPassword: "0F5DD14AE2",
      },
    };
  },
};

test("JazzCash calculates the secure hash exactly as documented by the sandbox docs", () => {
  const fields = {
    pp_MerchantID: "MER123",
    pp_OrderInfo: "A48cvE28",
    pp_Amount: "2995",
  } satisfies Record<string, string>;

  assert.equal(buildJazzcashSecureHash("0F5DD14AE2", fields), officialHash);
  assert.equal(verifyJazzcashSecureHash("0F5DD14AE2", { ...fields, pp_SecureHash: officialHash }), true);
  assert.equal(verifyJazzcashSecureHash("0F5DD14AE2", { ...fields, pp_SecureHash: "deadbeef" }), false);
});

test("JazzCash response codes map to documented statuses", () => {
  assert.equal(mapJazzcashResponseCode("000"), "SUCCEEDED");
  assert.equal(mapJazzcashResponseCode("100"), "PENDING");
  assert.equal(mapJazzcashResponseCode("003"), "FAILED");
  assert.equal(mapJazzcashResponseCode("012"), "CANCELLED");
});

test("JazzCash return verification requires matching transaction and amount", async () => {
  const response = {
    pp_TxnRefNo: returnInput.transactionId,
    pp_Amount: returnInput.amountMinor.toString(),
    pp_TxnCurrency: "PKR",
    pp_ResponseCode: "000",
  };
  const signedResponse = {
    ...response,
    pp_SecureHash: buildJazzcashSecureHash(merchantPassword, response),
  };
  const verified = await jazzcashAdapter.verifyReturn!(
    returnInput,
    new URLSearchParams(signedResponse),
    returnCredentials,
  );
  assert.equal(verified?.outcome, "SUCCEEDED");

  for (const tampered of [
    { ...signedResponse, pp_Amount: "1" },
    { ...signedResponse, pp_TxnCurrency: "AED" },
    { ...signedResponse, pp_TxnRefNo: "txn-store-b" },
    { pp_TxnRefNo: returnInput.transactionId, pp_TxnCurrency: "PKR", pp_ResponseCode: "000" },
  ]) {
    const fields: Record<string, string> = { ...tampered };
    fields.pp_SecureHash = buildJazzcashSecureHash(merchantPassword, fields);
    assert.equal(
      await jazzcashAdapter.verifyReturn!(returnInput, new URLSearchParams(fields), returnCredentials),
      null,
    );
  }
});

test("JazzCash checkout form containing its merchant password is rejected before browser return", async () => {
  const credentials: ResolvedPaymentCredentials = {
    ...returnCredentials,
    secrets: { merchantId: "FAKE-UNIT-MERCHANT", merchantPassword: "fake-unit-only-password" },
  };
  const session = await jazzcashAdapter.createCheckout(
    { ...returnInput, publicConfig: { merchantId: "FAKE-UNIT-MERCHANT" } },
    credentials,
  );

  assert.equal(isBrowserSafeProviderCheckout(session, credentials.secrets), false);
});

test("JazzCash remains unavailable until its checkout can keep credentials server-side", async () => {
  const account: PaymentProviderAccountConfig = {
    id: "acct-jazzcash",
    storeId: "store-a",
    provider: "jazzcash",
    mode: "TEST",
    enabled: true,
    publicConfig: { merchantId: "MER123" },
    secretRef: "vault:store-a/jazzcash/test",
  };

  assert.equal(isSecretReference(account.secretRef), true);
  assert.equal(
    await isOnlinePaymentMethodAvailable("jazzcash", account, { id: "store-a", countryCode: "PK", currency: "PKR" }, resolver),
    false,
  );
  assert.equal(
    await isOnlinePaymentMethodAvailable("jazzcash", account, { id: "store-b", countryCode: "PK", currency: "PKR" }, resolver),
    false,
  );
  assert.equal(
    await isOnlinePaymentMethodAvailable(
      "easypaisa",
      { ...account, id: "acct-easypaisa", provider: "easypaisa" },
      { id: "store-a", countryCode: "PK", currency: "PKR" },
      resolver,
    ),
    false,
  );
});
