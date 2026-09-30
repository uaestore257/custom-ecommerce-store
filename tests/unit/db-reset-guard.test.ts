// `npm run db:reset` drops every table, so its guard (assertSafeToReset in
// prisma/seed-guard.ts) must refuse anything but a throwaway database on
// this computer. No database is contacted here.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { assertSafeToReset, ResetRefused } from "../../prisma/seed-guard";

const env = (vars: Record<string, string | undefined>) => vars as unknown as NodeJS.ProcessEnv;

test("a dev or test database on this computer can be reset", () => {
  for (const url of [
    "postgresql://u:p@localhost:5433/shop_dev",
    "postgresql://u:p@localhost:5433/shop_test",
    "postgresql://u:p@127.0.0.1:5432/shop_local",
    "postgresql://u:p@[::1]:5432/demo",
  ]) {
    assert.doesNotThrow(() => assertSafeToReset(env({ DATABASE_URL: url })), url);
  }
});

test("production, remote hosts, real-looking names and missing or broken URLs are refused", () => {
  for (const vars of [
    { NODE_ENV: "production", DATABASE_URL: "postgresql://u:p@localhost:5433/shop_dev" },
    { DATABASE_URL: "postgresql://u:p@db.example.com:5432/shop_dev" }, // dev name, but not on this computer
    { DATABASE_URL: "postgresql://u:p@10.0.0.5:5432/shop_test" },
    { DATABASE_URL: "postgresql://u:p@localhost.evil.com:5432/shop_dev" },
    { DATABASE_URL: "postgresql://u:p@localhost:5433/shop" },
    { DATABASE_URL: "postgresql://u:p@localhost:5433/shop_production" },
    { DATABASE_URL: "postgresql://u:p@localhost:5433/latest" }, // "test" inside a word doesn't count
    { DATABASE_URL: "not a url" },
    {},
  ]) {
    assert.throws(() => assertSafeToReset(env(vars)), ResetRefused, JSON.stringify(vars));
  }
});

test("npm run db:reset runs the guarded script, never `prisma migrate reset` directly", () => {
  const { scripts } = JSON.parse(readFileSync("package.json", "utf8"));
  assert.equal(scripts["db:reset"], "node scripts/db-command.mjs reset");
  const script = readFileSync("scripts/db-reset.ts", "utf8");
  const guard = script.indexOf("assertSafeToReset(process.env)");
  assert.ok(guard > 0, "the script calls the guard");
  assert.ok(guard < script.indexOf(`run("prisma", ["migrate", "reset"`), "the guard runs before the reset");
});
