import assert from "node:assert/strict";
import { test } from "node:test";
import { buildJazzcashSecureHash, mapJazzcashResponseCode, verifyJazzcashSecureHash } from "../../lib/server/payments/jazzcash";
import { isOnlinePaymentMethodAvailable } from "../../lib/server/payments/methods";
import type { PaymentCredentialResolver, PaymentProviderAccountConfig } from "../../lib/server/payments/types";

const officialHash = "c7689cda7474eb1adcd343fd0c0b676bad0ba66361cc46db589bdb0da4c1c867";

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

test("online payment availability remains store-scoped and fails closed", async () => {
  const account: PaymentProviderAccountConfig = {
    id: "acct-jazzcash",
    storeId: "store-a",
    provider: "jazzcash",
    mode: "TEST",
    enabled: true,
    publicConfig: { merchantId: "MER123" },
    secretRef: "vault:store-a/jazzcash/test",
  };

  assert.equal(
    await isOnlinePaymentMethodAvailable("jazzcash", account, { id: "store-a", countryCode: "PK", currency: "PKR" }, resolver),
    true,
  );
  assert.equal(
    await isOnlinePaymentMethodAvailable("jazzcash", account, { id: "store-b", countryCode: "PK", currency: "PKR" }, resolver),
    false,
  );
});
