interface DatabaseUrlEnvironment {
  DATABASE_URL?: string;
  DIRECT_URL?: string;
  NODE_ENV?: string;
}

/** Runtime database access always uses the application connection URL. */
export function runtimeDatabaseUrl(
  env: DatabaseUrlEnvironment = {
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    NODE_ENV: process.env.NODE_ENV,
  },
) {
  return env.DATABASE_URL;
}

/**
 * Prisma CLI uses the direct migration URL when configured. Production
 * migration commands must never silently use the runtime/pooler URL.
 */
export function prismaCliDatabaseUrl(
  env: DatabaseUrlEnvironment = {
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    NODE_ENV: process.env.NODE_ENV,
  },
  args: readonly string[] = process.argv.slice(2),
) {
  const directUrl = env.DIRECT_URL?.trim();
  if (env.NODE_ENV === "production" && args[0] === "migrate" && !directUrl) {
    throw new Error("DIRECT_URL is required for production Prisma migrations; refusing to use DATABASE_URL.");
  }
  return directUrl || env.DATABASE_URL;
}
