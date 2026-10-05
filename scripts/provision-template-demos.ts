// Creates the missing template demo stores (one per registered template;
// data in lib/template-demo-stores.ts, rules in
// lib/server/template-demo-stores.ts). Never updates or deletes anything,
// never touches a client store, and is safe to re-run.
//
//   npm run db:provision-template-demos                 # dry run: shows the target and the plan
//   npm run db:provision-template-demos -- --confirm <database name>
//
// The target is DATABASE_URL. For production, run it once as the release
// operator with the production DATABASE_URL, after migrations are applied.
import "dotenv/config";
import { createPrismaClient } from "../lib/server/db";
import { provisionTemplateDemoStores } from "../lib/server/template-demo-stores";

function target(databaseUrl: string | undefined) {
  if (!databaseUrl) throw new Error("DATABASE_URL is missing.");
  const url = new URL(databaseUrl);
  return { database: decodeURIComponent(url.pathname.slice(1)), host: url.hostname, port: url.port || "5432" };
}

async function main() {
  const { database, host, port } = target(process.env.DATABASE_URL);
  const index = process.argv.indexOf("--confirm");
  const confirmed = index >= 0 && process.argv[index + 1] === database;
  console.log(`Target database: ${database} on ${host}:${port}`);
  console.log(confirmed ? "Creating missing template demo stores…" : `Dry run. Re-run with --confirm ${database} to create the stores marked "would-create".`);

  const db = createPrismaClient();
  try {
    const results = await provisionTemplateDemoStores(db, { dryRun: !confirmed });
    for (const result of results) {
      console.log(`${result.template.padEnd(8)} ${result.slug.padEnd(16)} ${result.outcome}${result.detail ? ` (${result.detail})` : ""}`);
    }
    if (results.some((result) => result.outcome === "invalid")) process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Template demo provisioning failed.");
  process.exitCode = 1;
});
