// Runs the database tests against a SEPARATE test database:
//   1. resets it (drops all data!) and applies every migration
//   2. seeds reference data + demo stores
//   3. runs tests/db/*.test.ts
// Safety: refuses to run unless TEST_DATABASE_URL is set, differs from
// DATABASE_URL and has "test" in the database name.
import "dotenv/config";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const LOCAL_POSTGRES_PORT = "5435";
const TEST_DATABASE = /(^|[_-])test($|[_-])/i;

function parseDatabaseTarget(connectionString: string, variable: string) {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error(`${variable} must be a valid PostgreSQL URL.`);
  }
  const database = decodeURIComponent(url.pathname.slice(1));
  const host = url.hostname.toLowerCase();
  const port = url.port || "5432";
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !database) {
    throw new Error(`${variable} must be a PostgreSQL URL with a database name.`);
  }
  return { database, host, port };
}

function sameDatabase(
  left: ReturnType<typeof parseDatabaseTarget>,
  right: ReturnType<typeof parseDatabaseTarget>,
) {
  const canonicalHost = (host: string) => LOCAL_HOSTS.has(host) ? "loopback" : host;
  return canonicalHost(left.host) === canonicalHost(right.host) &&
    left.port === right.port &&
    left.database === right.database;
}

export function validateTestDatabaseTarget(testUrl: string, databaseUrl?: string) {
  const target = parseDatabaseTarget(testUrl, "TEST_DATABASE_URL");
  if (!LOCAL_HOSTS.has(target.host)) {
    throw new Error("TEST_DATABASE_URL must target localhost or a loopback address before it can be reset.");
  }
  if (target.port !== LOCAL_POSTGRES_PORT) {
    throw new Error(`TEST_DATABASE_URL must use local PostgreSQL port ${LOCAL_POSTGRES_PORT} before it can be reset.`);
  }
  if (!TEST_DATABASE.test(target.database)) {
    throw new Error(`Refusing to reset "${target.database}": database name must contain a separate test segment.`);
  }
  if (databaseUrl) {
    const applicationTarget = parseDatabaseTarget(databaseUrl, "DATABASE_URL");
    if (sameDatabase(target, applicationTarget)) {
      throw new Error(`Refusing to reset "${target.database}": TEST_DATABASE_URL resolves to the same database as DATABASE_URL.`);
    }
  }
  return target;
}

async function confirmReset(target: ReturnType<typeof parseDatabaseTarget>) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("An interactive terminal is required; no database changes were made.");
  }

  console.log(`Target database: ${target.database}`);
  console.log(`PostgreSQL host: ${target.host}:${target.port}`);
  console.log("WARNING: database test setup will DROP ALL DATA in this test database before running tests.");
  console.log(`Type "DROP ${target.database}" exactly to continue.`);

  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await terminal.question("> ")).trim();
    if (answer !== `DROP ${target.database}`) {
      console.log("Cancelled. No database changes were made.");
      return false;
    }
  } finally {
    terminal.close();
  }
  return true;
}

// Runs a locally installed CLI (its package.json "bin") with this same
// Node binary instead of through npx. No shell is involved, so it works
// the same on every platform: on Windows npx is a batch file that Node
// can only start through a shell, which also triggers warning DEP0190.
function localCli(pkg: string) {
  const { bin } = JSON.parse(readFileSync(join("node_modules", pkg, "package.json"), "utf8"));
  return join("node_modules", pkg, typeof bin === "string" ? bin : bin[pkg]);
}
const run = (pkg: string, args: string[], env = process.env) =>
  execFileSync(process.execPath, [localCli(pkg), ...args], { stdio: "inherit", env });

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing database tests while NODE_ENV is production.");
  }
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) throw new Error("TEST_DATABASE_URL is not set (see .env.example).");

  const target = validateTestDatabaseTarget(testUrl, process.env.DATABASE_URL);

  const allTestFiles = readdirSync("tests/db")
    .filter((name) => name.endsWith(".test.ts"))
    .sort()
    .map((name) => `tests/db/${name}`);
  const requestedTestFiles = process.argv.slice(2).map((file) => file.replaceAll("\\", "/"));
  const invalidTestFiles = requestedTestFiles.filter((file) => !allTestFiles.includes(file));
  if (invalidTestFiles.length > 0) {
    throw new Error(`Only existing tests/db/*.test.ts files may be selected: ${invalidTestFiles.join(", ")}`);
  }
  const testFiles = requestedTestFiles.length > 0
    ? [...new Set(requestedTestFiles)]
    : allTestFiles;

  if (!(await confirmReset(target))) return;

  const env = { ...process.env, DATABASE_URL: testUrl, DIRECT_URL: "" };

  run("prisma", ["migrate", "reset", "--force"], env);
  run("prisma", ["db", "seed"], env);
  run("tsx", [
    "--conditions=react-server", // lets tests import server-only modules
    "--test",
    "--test-concurrency=1",
    ...testFiles,
  ], env);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(`Database tests refused or failed: ${error instanceof Error ? error.message : "unknown error"}`);
    process.exitCode = 1;
  });
}
