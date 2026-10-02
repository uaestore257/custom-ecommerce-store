import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { prismaCliDatabaseUrl, runtimeDatabaseUrl } from "@/lib/database-urls";

test("runtime database selection uses DATABASE_URL and ignores DIRECT_URL", () => {
  assert.equal(
    runtimeDatabaseUrl({
      DATABASE_URL: "postgresql://pool.example.com/app",
      DIRECT_URL: "postgresql://direct.example.com/app",
    }),
    "postgresql://pool.example.com/app",
  );
});

test("Prisma CLI prefers DIRECT_URL and falls back to DATABASE_URL when absent", () => {
  assert.equal(
    prismaCliDatabaseUrl({
      DATABASE_URL: "postgresql://pool.example.com/app",
      DIRECT_URL: "postgresql://direct.example.com/app",
    }, ["migrate", "deploy"]),
    "postgresql://direct.example.com/app",
  );
  assert.equal(
    prismaCliDatabaseUrl({ DATABASE_URL: "postgresql://local/app" }, ["migrate", "deploy"]),
    "postgresql://local/app",
  );
});

test("production Prisma migration configuration refuses DATABASE_URL fallback", () => {
  const env = {
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://pool-user:unique-test-sentinel@pool.example.com/app",
  } as NodeJS.ProcessEnv;

  assert.throws(
    () => prismaCliDatabaseUrl(env, ["migrate", "deploy"]),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /DIRECT_URL is required/);
      assert.doesNotMatch(error.message, /pool-user|unique-test-sentinel|pool\.example\.com/);
      return true;
    },
  );
});

test("Prisma generate and Vercel build are not treated as database migrations", () => {
  assert.equal(
    prismaCliDatabaseUrl({ NODE_ENV: "production", DATABASE_URL: "postgresql://pool.example.com/app" }, ["generate"]),
    "postgresql://pool.example.com/app",
  );

  const prismaConfig = readFileSync(new URL("../../prisma.config.ts", import.meta.url), "utf8");
  assert.match(prismaConfig, /prismaCliDatabaseUrl\(\)/);
  const packageJson = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
  assert.equal(packageJson.scripts.build, "next build");
  assert.equal(packageJson.scripts.postinstall, "prisma generate");
});
