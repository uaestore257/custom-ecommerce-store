// Refuses to seed demo data into, or reset, anything that might be a real
// database. Demo data must never reach production, and the seed never
// creates passwords, accounts or a platform owner.

export class SeedRefused extends Error {}
export class ResetRefused extends Error {}

/** Database names that mark a throwaway database, e.g. shop_dev or shop_test. */
const THROWAWAY_NAME = /(^|[_-])(dev|test|local|demo)($|[_-])/i;
/** Hosts on this computer. A reset never reaches a database elsewhere. */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** Throws unless the target looks like a local development or test database. */
export function assertSafeToSeed(env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV === "production") {
    throw new SeedRefused("Refusing to seed: NODE_ENV is production. Demo data must never reach production.");
  }
  const url = env.DATABASE_URL;
  if (!url) throw new SeedRefused("DATABASE_URL is not set (see .env.example).");
  const name = new URL(url).pathname.slice(1);
  if (!THROWAWAY_NAME.test(name)) {
    throw new SeedRefused(
      `Refusing to seed "${name}": demo data is only seeded into databases whose name marks them as dev/test/local/demo (e.g. shop_dev).`,
    );
  }
}

/**
 * Throws unless DATABASE_URL is a dev/test/local/demo database on this
 * computer. `npm run db:reset` (scripts/db-reset.ts) calls this BEFORE
 * `prisma migrate reset`, which drops every table: the seed's own check
 * would run only after the data was already gone.
 */
export function assertSafeToReset(env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV === "production") throw new ResetRefused("Refusing to reset: NODE_ENV is production.");
  const url = env.DATABASE_URL;
  if (!url) throw new ResetRefused("DATABASE_URL is not set (see .env.example).");
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    throw new ResetRefused("Refusing to reset: DATABASE_URL is not a valid URL.");
  }
  if (!LOCAL_HOSTS.has(target.hostname)) {
    throw new ResetRefused(`Refusing to reset a database on "${target.hostname}": only databases on this computer (localhost) can be reset.`);
  }
  const name = target.pathname.slice(1);
  if (!THROWAWAY_NAME.test(name)) {
    throw new ResetRefused(`Refusing to reset "${name}": only databases whose name marks them as dev/test/local/demo (e.g. shop_dev) can be reset.`);
  }
}
