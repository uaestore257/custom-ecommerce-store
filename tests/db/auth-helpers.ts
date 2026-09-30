// Shared helpers for the authentication database tests (not a test file).
// Everything goes through the real Better Auth HTTP handler and the real
// guards; only the Next.js request APIs are replaced (request-runtime).
import { getDb } from "../../lib/server/db";
import { authHandler, getAuth } from "../../lib/server/auth/auth";
import { createPlatformOwner } from "../../lib/server/auth/platform-owner";
import { setRequestRuntimeForTests } from "../../lib/server/request-runtime";

export const BASE_URL = "http://admin.test.local";
export const ADMIN_HOST = "admin.test.local";
export const STORE_HOST = "nest-and-oak.test.local";
export const OWNER_EMAIL = "platform-owner@test.example";
export const OWNER_PASSWORD = "correct horse battery staple 42";

/** Test-only auth settings. Must run before the first getAuth() call. */
export function setTestAuthEnv() {
  process.env.BETTER_AUTH_SECRET = "test-secret-".padEnd(48, "x");
  process.env.BETTER_AUTH_URL = BASE_URL;
  process.env.ADMIN_HOST = ADMIN_HOST;
  process.env.PLATFORM_ROOT_DOMAIN = "test.local";
  process.env.TRUSTED_IP_HEADER = "";
}

/** The single platform owner of the test database (created once). */
export async function ensurePlatformOwner() {
  const db = getDb();
  const existing = await db.user.findFirst({ where: { isPlatformOwner: true } });
  if (existing) return existing;
  const created = await createPlatformOwner(getAuth(), db, { email: OWNER_EMAIL, name: "Test Platform Owner", password: OWNER_PASSWORD });
  return db.user.findUniqueOrThrow({ where: { id: created.id } });
}

export async function authRequest(path: string, body: unknown, headers: Record<string, string> = {}) {
  const host = headers.host ?? ADMIN_HOST;
  const origin = headers.origin ?? (host === ADMIN_HOST ? BASE_URL : `http://${host}`);
  return authHandler(
    new Request(`http://${host}/api/auth${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", origin, host, ...headers },
      body: JSON.stringify(body),
    }),
  );
}

/** "name=value; name2=value2" from a response's Set-Cookie headers. */
export function cookieHeader(response: Response) {
  return response.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .filter((c) => !c.endsWith("="))
    .join("; ");
}

/** Signs in over HTTP and returns the Cookie header. Clears rate limits first. */
export async function signIn(email = OWNER_EMAIL, password = OWNER_PASSWORD, host = ADMIN_HOST) {
  await getDb().rateLimit.deleteMany();
  const response = await authRequest("/sign-in/email", { email, password }, { host });
  if (!response.ok) throw new Error(`sign-in failed: ${response.status}`);
  return cookieHeader(response);
}

/** Makes guards and Server Actions see a request with this Cookie header (or none). */
export function actAs(cookie: string | null, host = ADMIN_HOST) {
  setRequestRuntimeForTests({
    async headers() {
      const headers = new Headers({ host });
      if (cookie) headers.set("cookie", cookie);
      return headers;
    },
    revalidateAdmin() {},
  });
}
