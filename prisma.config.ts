// Prisma 7 configuration. Prisma no longer reads .env on its own, so
// dotenv loads DATABASE_URL here (copy .env.example to .env).
import "dotenv/config";
import { defineConfig } from "prisma/config";
import { prismaCliDatabaseUrl } from "./lib/database-urls";

const url = prismaCliDatabaseUrl();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // Only needed by Prisma CLI commands. Leaving it out when neither URL is
  // set lets `prisma generate` work without a database connection.
  ...(url && { datasource: { url } }),
});
