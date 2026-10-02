import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function isSupportedNodeVersion(version) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!match) return false;
  const [, major, minor] = match.map(Number);
  return major === 22 && minor >= 12;
}

export function ensureEnvFile(projectRoot) {
  const examplePath = join(projectRoot, ".env.example");
  const envPath = join(projectRoot, ".env");

  try {
    const example = readFileSync(examplePath, "utf8");
    const secretLine = /^BETTER_AUTH_SECRET=""$/m;
    if (!secretLine.test(example)) {
      throw new Error(".env.example is missing the expected empty BETTER_AUTH_SECRET setting.");
    }
    const secret = randomBytes(32).toString("base64url");
    const content = example.replace(secretLine, `BETTER_AUTH_SECRET="${secret}"`);
    writeFileSync(envPath, content, { encoding: "utf8", flag: "wx" });
    return "created";
  } catch (error) {
    if (error.code === "EEXIST") return "preserved";
    throw error;
  }
}

function main() {
  if (!isSupportedNodeVersion(process.version)) {
    console.error(`Node.js 22.12 or newer within major version 22 is required; found ${process.version}.`);
    process.exitCode = 1;
    return;
  }

  const checkOnly = process.argv.includes("--check");
  const envPath = join(root, ".env");
  let envStatus;

  if (checkOnly) {
    envStatus = existsSync(envPath) ? "present (preserved)" : "missing";
    console.log(`Node.js ${process.version} is supported; .env is ${envStatus}.`);
    console.log("Check only: no files changed and dependencies were not installed.");
    return;
  }

  envStatus = ensureEnvFile(root);
  if (envStatus === "created") {
    console.log("Created .env from .env.example and generated a local auth secret (value not shown).");
    console.log("Review local database host/port settings in .env before starting Docker or migrating.");
  } else {
    console.log(".env already exists; preserved it without reading or changing its contents.");
  }

  const npmCli = process.env.npm_execpath;
  if (!npmCli) {
    console.error("Could not locate the active npm CLI; run this command using `npm run setup`.");
    process.exitCode = 1;
    return;
  }

  console.log("Installing locked dependencies with npm ci...");
  const result = spawnSync(process.execPath, [npmCli, "ci"], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    return;
  }

  console.log("Setup complete. Database migrations and demo seeding are separate, confirmation-gated steps.");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(`Setup failed: ${error.message}`);
    process.exitCode = 1;
  }
}
