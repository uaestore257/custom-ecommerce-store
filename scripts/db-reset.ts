// `npm run db:reset`: resets the LOCAL development database.
//   1. checks DATABASE_URL is a dev/test/local/demo database on this
//      computer and NODE_ENV isn't production (assertSafeToReset in
//      prisma/seed-guard.ts) — BEFORE anything is dropped
//   2. resets it (drops all data!) and applies every migration
//   3. seeds reference data + demo stores
// Prisma reads the same DATABASE_URL (prisma.config.ts), so the database
// checked here is the one that gets reset.
import "dotenv/config";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { assertSafeToReset, ResetRefused } from "../prisma/seed-guard";

try {
  assertSafeToReset(process.env);
} catch (error) {
  if (!(error instanceof ResetRefused)) throw error;
  console.error(error.message);
  process.exit(1);
}

// Runs a locally installed CLI with this same Node binary, as
// scripts/test-db.ts does (no shell, works the same on every platform).
function localCli(pkg: string) {
  const { bin } = JSON.parse(readFileSync(join("node_modules", pkg, "package.json"), "utf8"));
  return join("node_modules", pkg, typeof bin === "string" ? bin : bin[pkg]);
}
const run = (pkg: string, args: string[]) => execFileSync(process.execPath, [localCli(pkg), ...args], { stdio: "inherit" });

run("prisma", ["migrate", "reset", "--force"]);
run("prisma", ["db", "seed"]);
