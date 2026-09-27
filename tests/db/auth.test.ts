// Authentication (Better Auth) and the platform-owner guard, end to end:
// real HTTP handler, real Session/Account rows, real guards.
import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { authHandler, createAuth, DISABLED_PATHS, ENABLED_PATHS, getAuth } from "../../lib/server/auth/auth";
import { AccessDenied, getSignedInUser, requirePlatformOwner } from "../../lib/server/auth/guards";
import { createPlatformOwner, PlatformOwnerError, resetPlatformOwnerPassword } from "../../lib/server/auth/platform-owner";
import { getDb } from "../../lib/server/db";
import { setRequestRuntimeForTests } from "../../lib/server/request-runtime";
import {
  actAs,
  ADMIN_HOST,
  authRequest,
  BASE_URL,
  cookieHeader,
  ensurePlatformOwner,
  OWNER_EMAIL,
  OWNER_PASSWORD,
  signIn,
  setTestAuthEnv,
} from "./auth-helpers";
import { rejects, uid } from "./helpers";

setTestAuthEnv();
const db = getDb();
let ownerId = "";

before(async () => {
  ownerId = (await ensurePlatformOwner()).id;
});
beforeEach(async () => {
  await db.rateLimit.deleteMany();
});
after(async () => {
  setRequestRuntimeForTests(null);
  await db.$disconnect();
});

async function expectDenied(reason: "unauthenticated" | "forbidden") {
  await assert.rejects(requirePlatformOwner(), (e: unknown) => e instanceof AccessDenied && e.reason === reason);
}

// ---------- endpoints ----------

test("public sign-up is disabled and creates nothing", async () => {
  const email = `signup-${uid()}@example.com`;
  const response = await authRequest("/sign-up/email", { email, password: "a much longer password 123", name: "Mallory" });
  assert.equal(response.ok, false);
  assert.equal(await db.user.count({ where: { email } }), 0);
});

test("every Better Auth endpoint is either enabled on purpose or disabled", () => {
  const known = new Set<string>([...ENABLED_PATHS, ...DISABLED_PATHS]);
  const exposed = Object.values(getAuth().api)
    .map((endpoint) => (endpoint as { path?: string }).path)
    .filter((path): path is string => typeof path === "string");
  for (const path of exposed) assert.ok(known.has(path), `new Better Auth endpoint needs a decision: ${path}`);
});

test("disabled endpoints are not reachable over HTTP, including ones with parameters", async () => {
  for (const path of [...DISABLED_PATHS, "/callback/github", "/reset-password/abc", "/sign-in/email/", "/sign-in/social/x"]) {
    const concrete = path.replace(":id", "github").replace(":token", "abc");
    const response = await authRequest(concrete, {});
    assert.equal(response.status, 404, `${path} should be disabled`);
    const get = await authHandler(new Request(`${BASE_URL}/api/auth${concrete}`, { headers: { host: ADMIN_HOST } }));
    assert.equal(get.status, 404, `GET ${path} should be disabled`);
  }
});

test("a profile update can't be used to become platform owner", async () => {
  const cookie = await signIn();
  const response = await authRequest("/update-user", { name: "x", isPlatformOwner: true }, { cookie });
  assert.equal(response.status, 404);
  const other = await db.user.create({ data: { email: `plain-${uid()}@example.com`, name: "Plain" } });
  assert.equal((await db.user.findUniqueOrThrow({ where: { id: other.id } })).isPlatformOwner, false);
});

// ---------- sign-in ----------

test("wrong password and unknown email fail the same way, and are audited without secrets", async () => {
  const before = await db.auditEvent.count({ where: { action: "auth.sign_in_failed" } });
  const wrong = await authRequest("/sign-in/email", { email: OWNER_EMAIL, password: "not the password at all" });
  const unknown = await authRequest("/sign-in/email", { email: `nobody-${uid()}@example.com`, password: "whatever password 1" });
  assert.equal(wrong.status, unknown.status);
  assert.equal(wrong.ok, false);
  const [a, b] = [await wrong.json(), await unknown.json()];
  assert.equal(a.code, b.code);
  assert.equal(cookieHeader(wrong), "", "no session cookie on failure");

  const events = await db.auditEvent.findMany({ where: { action: "auth.sign_in_failed" }, orderBy: { createdAt: "desc" }, take: 2 });
  assert.equal(await db.auditEvent.count({ where: { action: "auth.sign_in_failed" } }), before + 2);
  for (const e of events) {
    assert.equal(e.actorUserId, null);
    assert.equal(e.metadata, null, "no email or password stored");
  }
});

test("the correct password signs in with a host-only, httpOnly, SameSite=Lax cookie", async () => {
  await db.rateLimit.deleteMany();
  const response = await authRequest("/sign-in/email", { email: OWNER_EMAIL, password: OWNER_PASSWORD });
  assert.equal(response.status, 200);
  const session = response.headers.getSetCookie().find((c) => c.startsWith("codex-admin.session_token="));
  assert.ok(session, "session cookie set");
  assert.match(session, /HttpOnly/i);
  assert.match(session, /SameSite=Lax/i);
  assert.match(session, /Path=\//);
  assert.doesNotMatch(session, /Domain=/i, "host-only: never shared with other subdomains");
  assert.ok(await db.auditEvent.findFirst({ where: { action: "auth.sign_in", actorUserId: ownerId } }));
});

test("in production the cookie is Secure and __Secure- prefixed", async () => {
  const prodAuth = createAuth(db, {
    secret: "prod-test-secret-".padEnd(48, "y"),
    baseURL: "https://admin.codexstore.test",
    adminHost: "admin.codexstore.test",
    trustedIpHeader: null,
    production: true,
  });
  const response = await authHandler(
    new Request("https://admin.codexstore.test/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://admin.codexstore.test" },
      body: JSON.stringify({ email: OWNER_EMAIL, password: OWNER_PASSWORD }),
    }),
    prodAuth,
  );
  assert.equal(response.status, 200);
  const session = response.headers.getSetCookie().find((c) => c.includes("session_token="));
  assert.ok(session?.startsWith("__Secure-codex-admin.session_token="), session);
  assert.match(session!, /Secure/);
  assert.doesNotMatch(session!, /Domain=/i);
});

test("sign-in from another origin is rejected", async () => {
  const response = await authRequest(
    "/sign-in/email",
    { email: OWNER_EMAIL, password: OWNER_PASSWORD },
    { origin: "https://evil.example" },
  );
  assert.equal(response.ok, false);
  assert.equal(cookieHeader(response), "");
});

test("sign-in is rate limited", async () => {
  await db.rateLimit.deleteMany();
  const statuses: number[] = [];
  for (let i = 0; i < 7; i++) {
    statuses.push((await authRequest("/sign-in/email", { email: OWNER_EMAIL, password: `wrong password ${i}` })).status);
  }
  assert.ok(statuses.slice(0, 5).every((s) => s !== 429), statuses.join(","));
  assert.equal(statuses[6], 429);
  // Even the right password is refused while limited.
  assert.equal((await authRequest("/sign-in/email", { email: OWNER_EMAIL, password: OWNER_PASSWORD })).status, 429);
  await db.rateLimit.deleteMany();
});

// ---------- guard ----------

test("no cookie, a tampered cookie, or a made-up token is not signed in", async () => {
  actAs(null);
  await expectDenied("unauthenticated");
  const cookie = await signIn();
  actAs(cookie.replace(/session_token=([^;.]+)/, "session_token=$1x"));
  await expectDenied("unauthenticated");
  actAs("codex-admin.session_token=forged.signature");
  await expectDenied("unauthenticated");
});

test("a valid session gives the platform owner", async () => {
  actAs(await signIn());
  const owner = await requirePlatformOwner();
  assert.equal(owner.userId, ownerId);
  assert.equal(owner.email, OWNER_EMAIL);
});

test("an expired session is rejected", async () => {
  const cookie = await signIn();
  const token = decodeURIComponent(cookie.match(/session_token=([^;.]+)/)![1]);
  await db.session.update({ where: { token }, data: { expiresAt: new Date(Date.now() - 1000) } });
  actAs(cookie);
  await expectDenied("unauthenticated");
});

test("a revoked session is rejected, and sign-out deletes the session", async () => {
  const cookie = await signIn();
  const token = decodeURIComponent(cookie.match(/session_token=([^;.]+)/)![1]);
  const out = await authRequest("/sign-out", {}, { cookie });
  assert.equal(out.status, 200);
  assert.equal(await db.session.count({ where: { token } }), 0);
  assert.ok(await db.auditEvent.findFirst({ where: { action: "auth.sign_out", actorUserId: ownerId } }));
  actAs(cookie);
  await expectDenied("unauthenticated");
});

test("disabling the user ends access immediately and blocks new sign-ins", async () => {
  const cookie = await signIn();
  await db.user.update({ where: { id: ownerId }, data: { disabledAt: new Date() } });
  try {
    actAs(cookie);
    assert.equal(await getSignedInUser(), null);
    await expectDenied("unauthenticated");
    const response = await authRequest("/sign-in/email", { email: OWNER_EMAIL, password: OWNER_PASSWORD });
    assert.equal(response.ok, false, "disabled users can't open a session");
  } finally {
    await db.user.update({ where: { id: ownerId }, data: { disabledAt: null } });
  }
});

test("removing the platform-owner flag takes effect on the next request", async () => {
  const cookie = await signIn();
  await db.user.update({ where: { id: ownerId }, data: { isPlatformOwner: false } });
  try {
    actAs(cookie);
    await expectDenied("forbidden");
  } finally {
    await db.user.update({ where: { id: ownerId }, data: { isPlatformOwner: true } });
  }
});

test("users who are not the platform owner can't sign in (Phase 2a)", async () => {
  const email = `store-owner-${uid()}@example.com`;
  const ctx = await getAuth().$context;
  const user = await ctx.internalAdapter.createUser({ email, name: "Store Owner" }, { method: "admin" });
  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: "credential",
    accountId: user.id,
    password: await ctx.password.hash("a store owner password 9"),
  });
  const response = await authRequest("/sign-in/email", { email, password: "a store owner password 9" });
  assert.equal(response.ok, false);
  assert.equal(await db.session.count({ where: { userId: user.id } }), 0);
});

// ---------- platform owner account ----------

test("only one platform owner can exist (CLI and database)", async () => {
  await assert.rejects(
    createPlatformOwner(getAuth(), db, { email: `second-${uid()}@example.com`, name: "Second", password: "another long passphrase 77" }),
    PlatformOwnerError,
  );
  const other = await db.user.create({ data: { email: `other-${uid()}@example.com`, name: "Other" } });
  await rejects(() => db.user.update({ where: { id: other.id }, data: { isPlatformOwner: true } }), /User_single_platform_owner|Unique constraint/i);
});

test("weak passwords are refused by the CLI", async () => {
  for (const password of ["short", "password12345", "aaaaaaaaaaaaaaaa", `${"platform-owner"}0123456789`]) {
    await assert.rejects(resetPlatformOwnerPassword(getAuth(), db, { email: OWNER_EMAIL, password }), PlatformOwnerError);
  }
});

test("password reset revokes every session; old password stops working", async () => {
  const first = await signIn();
  const second = await signIn();
  const newPassword = "a brand new passphrase 2026";
  await resetPlatformOwnerPassword(getAuth(), db, { email: OWNER_EMAIL, password: newPassword });
  try {
    assert.equal(await db.session.count({ where: { userId: ownerId } }), 0);
    for (const cookie of [first, second]) {
      actAs(cookie);
      await expectDenied("unauthenticated");
    }
    await db.rateLimit.deleteMany();
    assert.equal((await authRequest("/sign-in/email", { email: OWNER_EMAIL, password: OWNER_PASSWORD })).ok, false);
    actAs(await signIn(OWNER_EMAIL, newPassword));
    assert.equal((await requirePlatformOwner()).userId, ownerId);
    assert.ok(await db.auditEvent.findFirst({ where: { action: "platform_owner.password_reset", actorUserId: ownerId } }));
  } finally {
    await resetPlatformOwnerPassword(getAuth(), db, { email: OWNER_EMAIL, password: OWNER_PASSWORD });
  }
});

test("the password is stored only as a hash in Account", async () => {
  const account = await db.account.findFirstOrThrow({ where: { userId: ownerId, providerId: "credential" } });
  assert.ok(account.password);
  assert.notEqual(account.password, OWNER_PASSWORD);
  assert.ok(!account.password.includes(OWNER_PASSWORD));
  const sessions = await db.session.findMany({ where: { userId: ownerId } });
  for (const s of sessions) assert.ok(!JSON.stringify(s).includes(OWNER_PASSWORD));
});

test("audit events can't be edited or deleted", async () => {
  const event = await db.auditEvent.findFirstOrThrow({ where: { actorUserId: ownerId } });
  await rejects(() => db.auditEvent.update({ where: { id: event.id }, data: { action: "auth.sign_out" } }), /cannot be modified/);
  await rejects(() => db.auditEvent.delete({ where: { id: event.id } }), /cannot be deleted/);
});

