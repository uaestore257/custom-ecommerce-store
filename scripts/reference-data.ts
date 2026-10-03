import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { runtimeDatabaseUrl } from "../lib/database-urls";
import { TIME_ZONES } from "../lib/time-zones";
import { upsertReferenceRows } from "../prisma/reference-data";

async function main() {
  const connectionString = runtimeDatabaseUrl();
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Configure the app's existing database connection first.");
  }

  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    const counts = await db.$transaction(
      (tx) => upsertReferenceRows(tx),
      { maxWait: 10_000, timeout: 120_000 },
    );
    console.log(
      `Reference data ready: ${counts.countries} countries, ${counts.currencies} currencies, ` +
        `${counts.languages} languages, and ${TIME_ZONES.length} IANA timezones.`,
    );
  } finally {
    await db.$disconnect();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error
    ? error.message.replace(/(?:postgres|postgresql):\/\/[^\s"'`]+/gi, "[redacted database URL]")
    : "Unexpected non-Error failure.";
  console.error(`Reference-data population failed: ${message}`);
  process.exitCode = 1;
});
