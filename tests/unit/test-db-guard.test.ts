import assert from "node:assert/strict";
import { test } from "node:test";
import { validateTestDatabaseTarget } from "../../scripts/test-db";

const localTestUrl = "postgresql://tester:secret@localhost:5435/shop_test";

test("allows a loopback test target when the application database is remote", () => {
  assert.doesNotThrow(() => validateTestDatabaseTarget(
    localTestUrl,
    "postgresql://app:secret@db.example.com:5432/shop_production",
  ));
});

test("rejects a test target with the same database identity as the application URL", () => {
  assert.throws(() => validateTestDatabaseTarget(
    localTestUrl,
    "postgresql://app:secret@127.0.0.1:5435/shop_test",
  ), /resolves to the same database/);
});

test("rejects a remote test target", () => {
  assert.throws(() => validateTestDatabaseTarget(
    "postgresql://tester:secret@db.example.com:5435/shop_test",
  ), /TEST_DATABASE_URL must target localhost or a loopback address/);
});

test("rejects a loopback test target on a non-canonical PostgreSQL port", () => {
  assert.throws(
    () => validateTestDatabaseTarget("postgresql://localhost:5433/shop_test"),
    /must use local PostgreSQL port 5435/,
  );
});

test("rejects a malformed test URL", () => {
  assert.throws(() => validateTestDatabaseTarget("not a URL"), /valid PostgreSQL URL/);
});

test("continues to allow only the project's explicit loopback hosts for test targets", () => {
  for (const host of ["localhost", "127.0.0.1", "[::1]"]) {
    assert.equal(
      validateTestDatabaseTarget(`postgresql://tester:secret@${host}:5435/shop_test`).host,
      host,
    );
  }
  for (const host of ["10.0.0.5", "localhost.evil.com"]) {
    assert.throws(
      () => validateTestDatabaseTarget(`postgresql://tester:secret@${host}:5435/shop_test`),
      /TEST_DATABASE_URL must target localhost or a loopback address/,
    );
  }
});
