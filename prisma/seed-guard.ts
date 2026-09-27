// Refuses to seed demo data into anything that might be a real database.
// Demo data must never reach production, and the seed never creates
// passwords, accounts or a platform owner.

export class SeedRefused extends Error {}

/** Throws unless the target looks like a local development or test database. */
export function assertSafeToSeed(env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV === "production") {
    throw new SeedRefused("Refusing to seed: NODE_ENV is production. Demo data must never reach production.");
  }
  const url = env.DATABASE_URL;
  if (!url) throw new SeedRefused("DATABASE_URL is not set (see .env.example).");
  const name = new URL(url).pathname.slice(1);
  if (!/(^|[_-])(dev|test|local|demo)($|[_-])/i.test(name)) {
    throw new SeedRefused(
      `Refusing to seed "${name}": demo data is only seeded into databases whose name marks them as dev/test/local/demo (e.g. shop_dev).`,
    );
  }
}
