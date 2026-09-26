// Runs the database tests against a SEPARATE test database:
//   1. resets it (drops all data!) and applies every migration
//   2. seeds reference data + demo stores
//   3. runs tests/db/*.test.ts
// Safety: refuses to run unless TEST_DATABASE_URL is set, differs from
// DATABASE_URL and has "test" in the database name.
import "dotenv/config";
import { execFileSync } from "node:child_process";

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) {
  console.error("TEST_DATABASE_URL is not set (see .env.example).");
  process.exit(1);
}
const dbName = new URL(testUrl).pathname.slice(1);
if (testUrl === process.env.DATABASE_URL || !dbName.includes("test")) {
  console.error(`Refusing to reset "${dbName}": use a separate database whose name contains "test".`);
  process.exit(1);
}

const env = { ...process.env, DATABASE_URL: testUrl };
const run = (cmd: string, args: string[]) => execFileSync(cmd, args, { stdio: "inherit", env });

run("npx", ["prisma", "migrate", "reset", "--force"]);
run("npx", ["prisma", "db", "seed"]);
run("npx", [
  "tsx",
  "--conditions=react-server", // lets tests import server-only modules
  "--test",
  "--test-concurrency=1",
  ...process.argv.slice(2),
  "tests/db/isolation.test.ts",
  "tests/db/integrity.test.ts",
  "tests/db/seed.test.ts",
]);
