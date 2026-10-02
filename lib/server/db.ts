import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { runtimeDatabaseUrl } from "@/lib/database-urls";

// One Prisma client per server process, created on first use (not at
// import time), so `next build` works without database credentials.
// In development, Next.js reloads modules often, so the client is kept
// on globalThis to avoid opening a new connection pool on every reload.
// This module is server-only: importing it from a Client Component fails
// the build, so database access can never reach the browser.

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function createPrismaClient(connectionString = runtimeDatabaseUrl()) {
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export function getDb(): PrismaClient {
  globalForPrisma.prisma ??= createPrismaClient();
  return globalForPrisma.prisma;
}
