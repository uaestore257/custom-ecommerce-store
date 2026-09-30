import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import { passwordProblem } from "../../lib/auth/password-policy";
import {
  DEMO_STORE_OWNERS,
  describeSafeDemoOwnerDatabase,
  getDemoStoreOwnerPasswords,
} from "../../lib/server/auth/demo-owners";

test("demo owner credentials are required from the local environment and validated", () => {
  assert.deepEqual(DEMO_STORE_OWNERS.map(({ slug }) => slug), ["nest-and-oak", "threadline", "voltbox"]);
  assert.equal(new Set(DEMO_STORE_OWNERS.map(({ email }) => email)).size, DEMO_STORE_OWNERS.length);
  assert.throws(() => getDemoStoreOwnerPasswords({}), /DEMO_NEST_AND_OAK_OWNER_PASSWORD/);

  const passwords = {
    "nest-and-oak": randomBytes(32).toString("base64url"),
    threadline: randomBytes(32).toString("base64url"),
    voltbox: randomBytes(32).toString("base64url"),
  };
  assert.deepEqual(
    getDemoStoreOwnerPasswords({
      DEMO_NEST_AND_OAK_OWNER_PASSWORD: passwords["nest-and-oak"],
      DEMO_THREADLINE_OWNER_PASSWORD: passwords.threadline,
      DEMO_VOLTBOX_OWNER_PASSWORD: passwords.voltbox,
    }),
    passwords,
  );
  for (const owner of DEMO_STORE_OWNERS) {
    assert.equal(passwordProblem(passwords[owner.slug], owner.email), null, owner.slug);
  }
});

test("demo owner database guard accepts only local development databases", () => {
  assert.deepEqual(
    describeSafeDemoOwnerDatabase("postgresql://shop:ignored@127.0.0.1:5435/shop_dev", undefined),
    { database: "shop_dev", host: "127.0.0.1", port: "5435" },
  );
  for (const [url, nodeEnv] of [
    ["postgresql://shop:ignored@db.example/shop_dev", undefined],
    ["postgresql://shop:ignored@127.0.0.1:5435/shop_test", undefined],
    ["postgresql://shop:ignored@127.0.0.1:5435/shop_prod", "production"],
  ]) {
    assert.throws(() => describeSafeDemoOwnerDatabase(url, nodeEnv));
  }
});
