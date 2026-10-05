import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const LOCAL_POSTGRES_PORT = "5435";
const DEVELOPMENT_DATABASE = /(^|[_-])(dev|local|demo)($|[_-])/i;
const TEST_DATABASE = /(^|[_-])test($|[_-])/i;

function parseTarget(connectionString, variableName) {
  if (!connectionString) {
    throw new Error(`${variableName} is missing; create and configure .env first.`);
  }

  let url;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error(`${variableName} is not a valid PostgreSQL URL.`);
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error(`${variableName} must use the PostgreSQL protocol.`);
  }
  if (!url.hostname || !url.pathname || url.pathname === "/") {
    throw new Error(`${variableName} must include a database host and name.`);
  }

  return {
    database: decodeURIComponent(url.pathname.slice(1)),
    host: url.hostname.toLowerCase(),
    port: url.port || "5432",
  };
}

function sameDatabase(left, right) {
  const leftHost = LOCAL_HOSTS.has(left.host) ? "loopback" : left.host;
  const rightHost = LOCAL_HOSTS.has(right.host) ? "loopback" : right.host;
  return leftHost === rightHost && left.port === right.port && left.database === right.database;
}

export function getLocalDevelopmentTarget(env = process.env, { useMigrationUrl = true } = {}) {
  if (env.NODE_ENV === "production") {
    throw new Error("Refusing local database changes while NODE_ENV is production.");
  }
  const migrationUrl = useMigrationUrl ? env.DIRECT_URL?.trim() : "";
  const variableName = migrationUrl ? "DIRECT_URL" : "DATABASE_URL";
  const target = parseTarget(migrationUrl || env.DATABASE_URL, variableName);
  if (!LOCAL_HOSTS.has(target.host)) {
    throw new Error("Refusing: local database commands only allow localhost/loopback hosts.");
  }
  if (target.port !== LOCAL_POSTGRES_PORT) {
    throw new Error(`Refusing: local database commands require PostgreSQL port ${LOCAL_POSTGRES_PORT}.`);
  }
  if (!DEVELOPMENT_DATABASE.test(target.database)) {
    throw new Error("Refusing: database name must clearly identify a dev, local, or demo database.");
  }
  return target;
}

export function getProductionTarget(env = process.env) {
  if (env.NODE_ENV !== "production") {
    throw new Error("Production deployment requires NODE_ENV=production.");
  }
  if (env.TEST_DATABASE_URL) {
    throw new Error("Refusing production deployment while TEST_DATABASE_URL is configured.");
  }
  if (!env.DIRECT_URL?.trim()) {
    throw new Error("DIRECT_URL is required for production migrations; refusing to use DATABASE_URL.");
  }
  const target = parseTarget(env.DIRECT_URL, "DIRECT_URL");
  const runtimeTarget = env.DATABASE_URL ? parseTarget(env.DATABASE_URL, "DATABASE_URL") : null;
  for (const candidate of [target, runtimeTarget].filter(Boolean)) {
    if (LOCAL_HOSTS.has(candidate.host)) {
      throw new Error("Refusing production deployment to a localhost/loopback database.");
    }
    if (DEVELOPMENT_DATABASE.test(candidate.database) || TEST_DATABASE.test(candidate.database)) {
      throw new Error("Refusing production deployment to a database marked dev, local, demo, or test.");
    }
  }
  return target;
}

export function getTestDatabaseTarget(env = process.env) {
  if (env.NODE_ENV === "production") {
    throw new Error("Refusing database tests while NODE_ENV is production.");
  }
  const target = parseTarget(env.TEST_DATABASE_URL, "TEST_DATABASE_URL");
  if (!LOCAL_HOSTS.has(target.host)) {
    throw new Error("Refusing: database resets for tests only allow localhost/loopback hosts.");
  }
  if (target.port !== LOCAL_POSTGRES_PORT) {
    throw new Error(`Refusing: test database resets require PostgreSQL port ${LOCAL_POSTGRES_PORT}.`);
  }
  if (!TEST_DATABASE.test(target.database)) {
    throw new Error("Refusing: TEST_DATABASE_URL database name must contain a separate test segment.");
  }
  if (env.DATABASE_URL) {
    const developmentTarget = parseTarget(env.DATABASE_URL, "DATABASE_URL");
    if (sameDatabase(target, developmentTarget)) {
      throw new Error("Refusing: TEST_DATABASE_URL resolves to the same database as DATABASE_URL.");
    }
  }
  return target;
}

export function expectedConfirmation(action, database) {
  if (action === "production deployment") return `DEPLOY ${database}`;
  if (action.endsWith("database reset")) return `DROP ${database}`;
  return "yes";
}

async function confirmTarget(target, action, { destructive = false, production = false } = {}) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("An interactive terminal is required; no database changes were made.");
  }

  console.log(`Target database: ${target.database}`);
  console.log(`PostgreSQL host: ${target.host}:${target.port}`);
  if (destructive) {
    console.log(`WARNING: ${action} will DROP ALL DATA in this database before continuing.`);
    console.log(`Type "${expectedConfirmation(action, target.database)}" exactly to continue.`);
  } else if (production) {
    console.log("WARNING: this applies pending migrations to a production database.");
    console.log(`Type "${expectedConfirmation(action, target.database)}" exactly to continue.`);
  } else {
    console.log(action === "seed"
      ? "This writes reference and demo records; it does not reset data."
      : "This applies checked-in migrations only; it does not reset data.");
    console.log('Type "yes" to continue.');
  }

  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await terminal.question("> ")).trim();
    const expected = expectedConfirmation(action, target.database);
    const confirmed = destructive || production ? answer === expected : answer.toLowerCase() === expected;
    if (!confirmed) {
      console.log("Cancelled. No database changes were made.");
      return false;
    }
  } finally {
    terminal.close();
  }
  return true;
}

function cliPath(packageName, binName) {
  const packageJsonPath = join(process.cwd(), "node_modules", packageName, "package.json");
  const metadata = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  const bin = typeof metadata.bin === "string" ? metadata.bin : metadata.bin?.[binName];
  if (!bin) throw new Error(`Could not locate the ${binName} CLI in ${packageName}.`);
  return join(dirname(packageJsonPath), bin);
}

function runNodeScript(script, args = [], env = process.env) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: process.cwd(),
    env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status ?? 1;
}

async function main() {
  const action = process.argv[2];
  if (!["migrate", "deploy", "deploy-production", "seed", "reset", "test"].includes(action)) {
    throw new Error("Usage: npm run db:migrate | db:deploy | db:deploy:production | db:seed | db:reset | test:db");
  }

  if (action === "reset" || action === "test") {
    const target = action === "reset"
      ? getLocalDevelopmentTarget(process.env, { useMigrationUrl: false })
      : getTestDatabaseTarget();
    const confirmationAction = action === "reset" ? "development database reset" : "test database reset";
    if (!(await confirmTarget(target, confirmationAction, { destructive: true }))) return;

    const extraArgs = process.argv.slice(3);
    if (action === "reset") {
      runNodeScript(cliPath("tsx", "tsx"), ["scripts/db-reset.ts", ...extraArgs]);
    } else {
      runNodeScript(cliPath("tsx", "tsx"), ["scripts/test-db.ts", ...extraArgs]);
    }
    return;
  }

  const production = action === "deploy-production";
  const target = production ? getProductionTarget() : getLocalDevelopmentTarget();
  const confirmationAction = production ? "production deployment" : action;
  if (!(await confirmTarget(target, confirmationAction, { production }))) return;

  runNodeScript(cliPath("prisma", "prisma"), ["migrate", "deploy"]);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`Database command refused or failed: ${error.message}`);
    process.exitCode = 1;
  });
}
