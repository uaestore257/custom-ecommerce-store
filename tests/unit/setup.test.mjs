import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { ensureEnvFile, isSupportedNodeVersion } from "../../scripts/setup.mjs";
import {
  expectedConfirmation,
  getLocalDevelopmentTarget,
  getProductionTarget,
  getTestDatabaseTarget,
} from "../../scripts/db-command.mjs";

test("the declared Node.js version range accepts supported Node 22 releases only", () => {
  assert.equal(isSupportedNodeVersion("v22.12.0"), true);
  assert.equal(isSupportedNodeVersion("v22.23.3"), true);
  assert.equal(isSupportedNodeVersion("v22.11.0"), false);
  assert.equal(isSupportedNodeVersion("v23.0.0"), false);
  assert.equal(isSupportedNodeVersion("v26.10.0"), false);
});

test("setup creates a private env template once and preserves an existing .env", (t) => {
  const root = mkdtempSync(join(tmpdir(), "store-setup-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));

  writeFileSync(join(root, ".env.example"), 'BETTER_AUTH_SECRET=""\nDATABASE_URL="postgresql://localhost/shop_dev"\n');
  assert.equal(ensureEnvFile(root), "created");
  const created = readFileSync(join(root, ".env"), "utf8");
  const secret = /^BETTER_AUTH_SECRET="([^"]+)"$/m.exec(created)?.[1];
  assert.ok(secret && secret.length >= 32);
  assert.match(created, /DATABASE_URL="postgresql:\/\/localhost\/shop_dev"/);

  writeFileSync(join(root, ".env"), "KEEP_THIS=untouched\n");
  assert.equal(ensureEnvFile(root), "preserved");
  assert.equal(readFileSync(join(root, ".env"), "utf8"), "KEEP_THIS=untouched\n");
});

test("database write guard accepts only loopback development database targets", () => {
  assert.deepEqual(
    getLocalDevelopmentTarget({ DATABASE_URL: "postgresql://user:secret@127.0.0.1:5435/shop_dev" }),
    { database: "shop_dev", host: "127.0.0.1", port: "5435" },
  );
  assert.throws(
    () => getLocalDevelopmentTarget({ DATABASE_URL: "postgresql://user:secret@example.com/shop_dev" }),
    /localhost\/loopback/,
  );
  assert.throws(
    () => getLocalDevelopmentTarget({ DATABASE_URL: "postgresql://user:secret@127.0.0.1:5435/shop_test" }),
    /dev, local, or demo/,
  );
  assert.throws(
    () => getLocalDevelopmentTarget({
      DATABASE_URL: "postgresql://user:secret@127.0.0.1:5435/shop_dev",
      NODE_ENV: "production",
    }),
    /NODE_ENV is production/,
  );
});

test("test database reset guard requires a separate local test database", () => {
  const env = {
    DATABASE_URL: "postgresql://shop:secret@127.0.0.1:5435/shop_dev",
    TEST_DATABASE_URL: "postgresql://shop:secret@127.0.0.1:5435/shop_test",
  };
  assert.deepEqual(getTestDatabaseTarget(env), {
    database: "shop_test",
    host: "127.0.0.1",
    port: "5435",
  });
  assert.throws(
    () => getTestDatabaseTarget({
      ...env,
      DATABASE_URL: "postgresql://shop:secret@127.0.0.1:5435/shop_test",
      TEST_DATABASE_URL: "postgresql://other:secret@127.0.0.1:5435/shop_test",
    }),
    /same database as DATABASE_URL/,
  );
  for (const testHost of ["127.0.0.1", "[::1]"]) {
    assert.throws(
      () => getTestDatabaseTarget({
        DATABASE_URL: "postgresql://shop:secret@localhost:5435/shop_test",
        TEST_DATABASE_URL: `postgresql://shop:secret@${testHost}:5435/shop_test`,
      }),
      /same database as DATABASE_URL/,
      `${testHost} must be treated as the same loopback host as localhost`,
    );
  }
  assert.throws(
    () => getTestDatabaseTarget({
      ...env,
      TEST_DATABASE_URL: "postgresql://shop:secret@db.example.test/shop_test",
    }),
    /localhost\/loopback/,
  );
  assert.throws(
    () => getTestDatabaseTarget({
      ...env,
      TEST_DATABASE_URL: "postgresql://shop:secret@127.0.0.1:5435/shop_testing",
    }),
    /separate test segment/,
  );
});

test("production deploy guard requires explicit production mode and a non-local production database", () => {
  const production = {
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://app:secret@db.example.com:5432/store",
  };
  assert.deepEqual(getProductionTarget(production), {
    database: "store",
    host: "db.example.com",
    port: "5432",
  });
  assert.throws(
    () => getProductionTarget({ ...production, NODE_ENV: "development" }),
    /NODE_ENV=production/,
  );
  assert.throws(
    () => getProductionTarget({
      ...production,
      DATABASE_URL: "postgresql://app:secret@127.0.0.1:5432/store",
    }),
    /localhost\/loopback/,
  );
  assert.throws(
    () => getProductionTarget({
      ...production,
      DATABASE_URL: "postgresql://app:secret@db.example.com:5432/store_test",
    }),
    /marked dev, local, demo, or test/,
  );
  assert.throws(
    () => getProductionTarget({ ...production, TEST_DATABASE_URL: "postgresql://db/shop_test" }),
    /TEST_DATABASE_URL is configured/,
  );
});

test("destructive and production confirmations include the exact database name", () => {
  assert.equal(expectedConfirmation("test database reset", "shop_test"), "DROP shop_test");
  assert.equal(expectedConfirmation("production deployment", "store"), "DEPLOY store");
  assert.equal(expectedConfirmation("migrate", "shop_dev"), "yes");
  assert.equal(expectedConfirmation("seed", "shop_dev"), "yes");
});

test("database-writing npm commands route through their safety wrapper", () => {
  const packageJson = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
  assert.match(packageJson.scripts["db:migrate"], /db-command\.mjs migrate$/);
  assert.match(packageJson.scripts["db:deploy"], /db-command\.mjs deploy$/);
  assert.match(packageJson.scripts["db:deploy:production"], /db-command\.mjs deploy-production$/);
  assert.match(packageJson.scripts["db:seed"], /db-command\.mjs seed$/);
  assert.match(packageJson.scripts["db:reset"], /db-command\.mjs reset$/);
  assert.match(packageJson.scripts["test:db"], /db-command\.mjs test$/);
});

test("direct destructive scripts refuse non-interactive execution before running Prisma", () => {
  const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const tsxCli = join(projectRoot, "node_modules", "tsx", "dist", "cli.mjs");
  const childEnv = {
    PATH: process.env.PATH ?? "",
    SystemRoot: process.env.SystemRoot ?? "",
    NODE_ENV: "development",
    DATABASE_URL: "postgresql://shop:fixture@localhost:5435/shop_dev",
    TEST_DATABASE_URL: "postgresql://shop:fixture@127.0.0.1:5435/shop_test",
  };

  for (const [script, expectedTarget] of [
    ["scripts/db-reset.ts", "interactive terminal"],
    ["scripts/test-db.ts", "interactive terminal"],
  ]) {
    const result = spawnSync(
      process.execPath,
      [tsxCli, join(projectRoot, script)],
      {
        cwd: projectRoot,
        env: childEnv,
        input: "",
        encoding: "utf8",
        timeout: 15000,
      },
    );
    assert.equal(result.error, undefined, `${script} subprocess should start`);
    assert.notEqual(result.status, 0, `${script} must refuse without an interactive confirmation`);
    assert.match(`${result.stdout}\n${result.stderr}`, new RegExp(expectedTarget));
    assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /migrate reset|Running seed command/);
  }
});
