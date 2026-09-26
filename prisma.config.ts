// Prisma 7 configuration. Prisma no longer reads .env on its own, so
// dotenv loads DATABASE_URL here (copy .env.example to .env).
import "dotenv/config";
import { defineConfig } from "prisma/config";

const url = process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // Only needed by migrate/seed/studio. Leaving it out when DATABASE_URL is
  // unset lets `npm install` (which runs `prisma generate`) work on a fresh
  // clone or CI machine without a database.
  ...(url && { datasource: { url } }),
});
