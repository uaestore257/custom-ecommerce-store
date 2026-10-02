import "dotenv/config";
import { createAuth } from "../lib/server/auth/auth";
import {
  describeSafeDemoOwnerDatabase,
  getDemoStoreOwnerPasswords,
  provisionDemoStoreOwners,
} from "../lib/server/auth/demo-owners";
import { createPrismaClient } from "../lib/server/db";

async function main() {
  const target = describeSafeDemoOwnerDatabase(process.env.DATABASE_URL, process.env.NODE_ENV);
  const confirmationIndex = process.argv.indexOf("--confirm");
  const confirmation = confirmationIndex >= 0 ? process.argv[confirmationIndex + 1] : undefined;
  if (confirmation !== target.database) {
    throw new Error(`Target: ${target.database} on ${target.host}:${target.port}. Re-run with --confirm ${target.database} to provision local demo owners.`);
  }

  console.log(`Provisioning local demo Store Owners in ${target.database} on ${target.host}:${target.port}.`);
  const db = createPrismaClient();
  try {
    const owners = await provisionDemoStoreOwners(createAuth(db), db, getDemoStoreOwnerPasswords());
    for (const owner of owners) console.log(`${owner.slug}: ${owner.email}`);
    console.log("Demo owner credentials provisioned. Passwords were not displayed.");
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Demo owner provisioning failed.");
  process.exitCode = 1;
});
