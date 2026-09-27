// Platform-owner account CLI. There is no sign-up page: this is the only
// way to create the platform owner or reset its password.
//
//   npm run platform:create-owner
//   npm run platform:reset-password
//
// It asks for everything interactively. Passwords are typed without
// being shown, never taken from command-line arguments or environment
// variables, and never printed or logged. It shows which database it
// will change and asks for confirmation first.
import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { PASSWORD_MIN_LENGTH } from "../lib/auth/password-policy";
import { createAuth } from "../lib/server/auth/auth";
import { createPlatformOwner, PlatformOwnerError, resetPlatformOwnerPassword } from "../lib/server/auth/platform-owner";
import { createPrismaClient } from "../lib/server/db";

const command = process.argv[2];

async function ask(question: string) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

/** Reads a line without echoing it (works in PowerShell, cmd and Unix terminals). */
function askHidden(question: string): Promise<string> {
  const stdin = process.stdin;
  process.stdout.write(question);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");
  return new Promise((resolve, reject) => {
    let value = "";
    const finish = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener("data", onData);
      process.stdout.write("\n");
    };
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n") {
          finish();
          resolve(value);
          return;
        }
        if (char === "\u0003") {
          finish();
          reject(new Error("Cancelled."));
          return;
        }
        if (char === "\u007f" || char === "\b") value = value.slice(0, -1);
        else if (char >= " ") value += char;
      }
    };
    stdin.on("data", onData);
  });
}

async function newPassword() {
  console.log(`Choose a password of at least ${PASSWORD_MIN_LENGTH} characters (a long passphrase is best).`);
  const password = await askHidden("New password: ");
  const again = await askHidden("Repeat password: ");
  if (password !== again) throw new PlatformOwnerError("The passwords don't match.");
  return password;
}

function describeDatabase(url: string | undefined) {
  if (!url) throw new PlatformOwnerError("DATABASE_URL is not set. Copy .env.example to .env and set it.");
  const parsed = new URL(url);
  return `${parsed.pathname.slice(1)} on ${parsed.hostname}${parsed.port ? `:${parsed.port}` : ""}`; // no credentials
}

async function main() {
  if (command !== "create" && command !== "reset-password") {
    console.error("Usage: npm run platform:create-owner | npm run platform:reset-password");
    process.exit(1);
  }
  if (!process.stdin.isTTY) {
    throw new PlatformOwnerError("Run this command in an interactive terminal (PowerShell, cmd or a Unix shell).");
  }

  console.log(`Database: ${describeDatabase(process.env.DATABASE_URL)}`);
  if ((await ask('Type "yes" to continue: ')).toLowerCase() !== "yes") {
    console.log("Nothing changed.");
    return;
  }

  const db = createPrismaClient();
  try {
    const auth = createAuth(db);
    if (command === "create") {
      const email = await ask("Platform owner email: ");
      const name = await ask("Your name: ");
      const password = await newPassword();
      const owner = await createPlatformOwner(auth, db, { email, name, password });
      console.log(`Platform owner created for ${owner.email}. Sign in at ${process.env.BETTER_AUTH_URL}/login`);
    } else {
      const email = await ask("Platform owner email: ");
      const password = await newPassword();
      const owner = await resetPlatformOwnerPassword(auth, db, { email, password });
      console.log(`Password changed for ${owner.email}. All of its sessions were signed out.`);
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  // Known problems get a plain message; anything else only its message
  // (never the input, so a password can't end up in the output).
  console.error(error instanceof PlatformOwnerError ? error.message : `Failed: ${(error as Error).message}`);
  process.exit(1);
});
