// The public storefront Server Action wrapper itself (not just the
// lib/server/inquiries.ts data-access layer that tests/db/inquiries.test.ts
// already covers) — the same convention tests/db/auth-actions.test.ts
// uses for admin actions: call the real exported "use server" function,
// with request headers injected via setRequestRuntimeForTests(), the way
// a crafted POST would reach it.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { submitInquiryAction } from "../../app/(storefront)/actions";
import { createAdminStore } from "../../lib/server/admin/stores";
import { setRequestRuntimeForTests } from "../../lib/server/request-runtime";
import { testActor, testDb, uid } from "./helpers";

const db = testDb();
after(() => db.$disconnect());

const TEST_IP_HEADER = "x-test-client-ip";
const previousTrustedIpHeader = process.env.TRUSTED_IP_HEADER;

/** Makes the action see a request with (or without) this IP header. */
function actAsRequest(ip: string | null) {
  setRequestRuntimeForTests({
    async headers() {
      const headers = new Headers();
      if (ip) headers.set(TEST_IP_HEADER, ip);
      return headers;
    },
    revalidateAdmin() {},
  });
}

async function makeStore(label: string) {
  const result = await createAdminStore(await testActor(db), db, {
    name: `Inquiry action ${label} ${uid()}`,
    slug: `inquiry-action-${label}-${uid()}`,
    businessType: "furniture",
    status: "ACTIVE",
    ownerName: "Owner",
    ownerEmail: `owner-${uid()}@example.com`,
    countryCode: "AE",
    baseCurrency: "AED",
    timezone: "Asia/Dubai",
    defaultLanguage: "en",
    languages: ["en"],
    accentColor: "#0f766e",
  });
  assert.ok(result.ok, JSON.stringify(result));
  return result.data.id;
}

let activeStore = "";

before(async () => {
  process.env.TRUSTED_IP_HEADER = TEST_IP_HEADER;
  activeStore = await makeStore("test");
});

after(() => {
  setRequestRuntimeForTests(null);
  process.env.TRUSTED_IP_HEADER = previousTrustedIpHeader;
});

const validInput = () => ({
  name: "Jane Visitor",
  email: "jane@example.com",
  subject: "Delivery question",
  message: "Do you deliver to Sharjah, and how long does it usually take?",
});

test("a well-formed storeId and valid input succeed end to end", async () => {
  actAsRequest(null);
  const result = await submitInquiryAction(activeStore, validInput());
  assert.ok(result.ok, JSON.stringify(result));
  const row = await db.inquiry.findUniqueOrThrow({ where: { id: result.data.id } });
  assert.equal(row.storeId, activeStore);
});

test("a malformed storeId is refused before touching the database, whatever its shape", async () => {
  actAsRequest(null);
  const before = await db.inquiry.count();
  for (const bad of [
    "not/an/id",
    "has spaces",
    "x".repeat(65), // one over the limit
    "",
    null,
    undefined,
    123,
    { id: activeStore },
    ["x"],
  ]) {
    const result = await submitInquiryAction(bad, validInput());
    assert.equal(result.ok, false, JSON.stringify(bad));
    if (!result.ok) assert.equal(result.error, "Invalid request.", JSON.stringify(bad));
  }
  const after = await db.inquiry.count();
  assert.equal(after, before, "no row should have been created for any malformed storeId");
});

test("an oversized but otherwise well-formed storeId is refused the same way (no database lookup leaks its non-existence)", async () => {
  actAsRequest(null);
  const result = await submitInquiryAction("a".repeat(65), validInput());
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error, "Invalid request.");
});

test("the trusted IP header is read via requestRuntime() and stored on the created row", async () => {
  actAsRequest("203.0.113.9");
  const result = await submitInquiryAction(activeStore, validInput());
  assert.ok(result.ok, JSON.stringify(result));
  const row = await db.inquiry.findUniqueOrThrow({ where: { id: result.data.id } });
  assert.equal(row.ipAddress, "203.0.113.9");
});

test("with no IP header, the row is stored with no IP but the action still succeeds", async () => {
  actAsRequest(null);
  const result = await submitInquiryAction(activeStore, validInput());
  assert.ok(result.ok, JSON.stringify(result));
  const row = await db.inquiry.findUniqueOrThrow({ where: { id: result.data.id } });
  assert.equal(row.ipAddress, null);
});

test("per-IP rate limiting works through the real action, not just the underlying function", async () => {
  const store = await makeStore("rate-limit");
  actAsRequest("198.51.100.7");
  for (let i = 0; i < 5; i++) {
    const r = await submitInquiryAction(store, validInput());
    assert.ok(r.ok, JSON.stringify(r));
  }
  const sixth = await submitInquiryAction(store, validInput());
  assert.equal(sixth.ok, false);
  if (!sixth.ok) assert.match(sixth.error, /too many/i);
});

// The generic-error catch path in submitInquiryAction() (an unexpected
// throw from submitInquiry(), e.g. a lost database connection, is
// reported as one fixed generic message, never the raw error) is NOT
// exercised here by forcing a real throw. lib/server/inquiries.ts is a
// genuine ESM module: `import { submitInquiry } from "..."` gives a
// live-binding accessor property (confirmed with
// `Object.getOwnPropertyDescriptor` — configurable: false, a getter, no
// `value`), which node:test's `mock.method()` cannot redefine (it needs
// an own, value-holding property, i.e. CJS-style module.exports). Node's
// newer `mock.module()` can intercept a real ESM module this way, but
// only under the still-experimental `--experimental-test-module-mocks`
// flag, which nothing else in this codebase needs — not worth adding
// project-wide for one test. The catch block itself is two lines with a
// fixed string and no interpolation of the caught error (see
// app/(storefront)/actions.ts), so its correctness is verified by
// reading it rather than by an automated test.
