// `npm run db:reset`: resets the LOCAL development database.
//   1. checks DATABASE_URL is a dev/test/local/demo database on this
//      computer and NODE_ENV isn't production (assertSafeToReset in
//      prisma/seed-guard.ts) — BEFORE anything is dropped
//   2. resets it (drops all data!) and applies every migration
//   3. seeds reference data + demo stores
// The Prisma CLI is explicitly pinned to DATABASE_URL for the reset, so the
// database checked here is the one that gets reset even if DIRECT_URL is set.
import "dotenv/config";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { assertSafeToReset, ResetRefused } from "../prisma/seed-guard";

async function confirmReset(databaseUrl: string) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("An interactive terminal is required; no database changes were made.");
  }

  const target = new URL(databaseUrl);
  const database = decodeURIComponent(target.pathname.slice(1));
  const host = target.hostname.toLowerCase();
  const port = target.port || "5432";
  console.log(`Target database: ${database}`);
  console.log(`PostgreSQL host: ${host}:${port}`);
  console.log("WARNING: development database reset will DROP ALL DATA in this database before reseeding.");
  console.log(`Type "DROP ${database}" exactly to continue.`);

  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await terminal.question("> ")).trim();
    if (answer !== `DROP ${database}`) {
      console.log("Cancelled. No database changes were made.");
      return false;
    }
  } finally {
    terminal.close();
  }
  return true;
}

// Runs a locally installed CLI with this same Node binary, as
// scripts/test-db.ts does (no shell, works the same on every platform).
function localCli(pkg: string) {
  const { bin } = JSON.parse(readFileSync(join("node_modules", pkg, "package.json"), "utf8"));
  return join("node_modules", pkg, typeof bin === "string" ? bin : bin[pkg]);
}
const run = (pkg: string, args: string[]) =>
  execFileSync(process.execPath, [localCli(pkg), ...args], {
    stdio: "inherit",
    env: { ...process.env, DIRECT_URL: "" },
  });

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  try {
    assertSafeToReset(process.env);
  } catch (error) {
    if (!(error instanceof ResetRefused)) throw error;
    console.error(error.message);
    process.exitCode = 1;
    return;
  }
  if (!databaseUrl || !(await confirmReset(databaseUrl))) return;

  run("prisma", ["migrate", "reset", "--force"]);
  run("prisma", ["db", "seed"]);
}

main().catch((error: unknown) => {
  console.error(`Database reset refused or failed: ${error instanceof Error ? error.message : "unknown error"}`);
  process.exitCode = 1;
});
