// Public store contact inquiries (lib/server/inquiries.ts). No sign-in is
// involved, so these tests call submitInquiry() directly with a storeId,
// the same way the storefront Server Action does.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createAdminStore, setAdminStoreStatus } from "../../lib/server/admin/stores";
import { submitInquiry } from "../../lib/server/inquiries";
import { testActor, testDb, uid } from "./helpers";

const db = testDb();
after(() => db.$disconnect());

let activeStore = "";
let draftStore = "";

async function makeStore(status: "ACTIVE" | "DRAFT") {
  const result = await createAdminStore(await testActor(db), db, {
    name: `Inquiry test ${uid()}`,
    slug: `inquiry-test-${uid()}`,
    businessType: "furniture",
    status,
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

const validInput = (overrides: Record<string, unknown> = {}) => ({
  name: "Jane Visitor",
  email: "jane@example.com",
  subject: "Delivery question",
  message: "Do you deliver to Sharjah, and how long does it usually take?",
  ...overrides,
});

before(async () => {
  activeStore = await makeStore("ACTIVE");
  draftStore = await makeStore("DRAFT");
});

test("a valid message is stored against the right store", async () => {
  const result = await submitInquiry(db, activeStore, validInput(), { ipAddress: `1.1.1.${uid()}` });
  assert.ok(result.ok, JSON.stringify(result));
  const row = await db.inquiry.findUniqueOrThrow({ where: { id: result.data.id } });
  assert.equal(row.storeId, activeStore);
  assert.equal(row.name, "Jane Visitor");
  assert.equal(row.email, "jane@example.com");
  assert.equal(row.status, "NEW");
});

test("invalid input is rejected and nothing is stored", async () => {
  const before = await db.inquiry.count({ where: { storeId: activeStore } });
  const result = await submitInquiry(
    db,
    activeStore,
    validInput({ email: "not-an-email", message: "short" }),
    { ipAddress: `1.1.2.${uid()}` },
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.fieldErrors?.email);
    assert.ok(result.fieldErrors?.message);
  }
  const after = await db.inquiry.count({ where: { storeId: activeStore } });
  assert.equal(after, before);
});

test("a storeId smuggled as something else is ignored: the route's storeId always wins", async () => {
  const result = await submitInquiry(
    db,
    activeStore,
    validInput({ storeId: draftStore }),
    { ipAddress: `1.1.3.${uid()}` },
  );
  assert.ok(result.ok, JSON.stringify(result));
  const row = await db.inquiry.findUniqueOrThrow({ where: { id: result.data.id } });
  assert.equal(row.storeId, activeStore);
});

test("a non-ACTIVE store refuses the message", async () => {
  const result = await submitInquiry(db, draftStore, validInput(), { ipAddress: `1.1.4.${uid()}` });
  assert.equal(result.ok, false);
  const count = await db.inquiry.count({ where: { storeId: draftStore } });
  assert.equal(count, 0);
});

test("a missing store refuses the message", async () => {
  const result = await submitInquiry(db, `missing-${uid()}`, validInput(), { ipAddress: `1.1.5.${uid()}` });
  assert.equal(result.ok, false);
});

test("repeated invalid submissions to the same store+IP are eventually rate limited, not left unthrottled", async () => {
  const ip = `7.7.1.${uid()}`;
  const invalid = validInput({ email: "not-an-email" });
  for (let i = 0; i < 5; i++) {
    const r = await submitInquiry(db, activeStore, invalid, { ipAddress: ip });
    assert.equal(r.ok, false);
    if (!r.ok) assert.ok(r.fieldErrors?.email, "still a normal validation error while under the limit");
  }
  const sixth = await submitInquiry(db, activeStore, invalid, { ipAddress: ip });
  assert.equal(sixth.ok, false);
  if (!sixth.ok) assert.match(sixth.error, /too many/i, "the 6th attempt is rate limited, not another validation error");
});

test("repeated probes against a missing store are eventually rate limited, not left unthrottled", async () => {
  const ip = `7.7.2.${uid()}`;
  const missingStore = `missing-${uid()}`;
  for (let i = 0; i < 5; i++) {
    const r = await submitInquiry(db, missingStore, validInput(), { ipAddress: ip });
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.error, /isn.t accepting messages/i, "still the normal store-unavailable message while under the limit");
  }
  const sixth = await submitInquiry(db, missingStore, validInput(), { ipAddress: ip });
  assert.equal(sixth.ok, false);
  if (!sixth.ok) assert.match(sixth.error, /too many/i, "the 6th attempt is rate limited, not another store-unavailable message");
});

test("an invalid submission and a missing-store probe against the same claimed store+IP share one budget", async () => {
  // Proves the fix directly: whichever check would have failed (rate
  // limit only cares about storeId+IP, not about which store, if any,
  // that id names), attempts are counted on ONE shared counter per
  // (claimed storeId, IP) — not reset by switching which kind of
  // request is sent.
  const ip = `7.7.3.${uid()}`;
  const claimedStore = `missing-${uid()}`; // never a real store in this test
  const r1 = await submitInquiry(db, claimedStore, validInput(), { ipAddress: ip }); // store-unavailable
  const r2 = await submitInquiry(db, claimedStore, validInput({ message: "short" }), { ipAddress: ip }); // would-be validation error, but store check runs first
  const r3 = await submitInquiry(db, claimedStore, validInput(), { ipAddress: ip });
  const r4 = await submitInquiry(db, claimedStore, validInput(), { ipAddress: ip });
  const r5 = await submitInquiry(db, claimedStore, validInput(), { ipAddress: ip });
  for (const r of [r1, r2, r3, r4, r5]) assert.equal(r.ok, false);
  const sixth = await submitInquiry(db, claimedStore, validInput(), { ipAddress: ip });
  assert.equal(sixth.ok, false);
  if (!sixth.ok) assert.match(sixth.error, /too many/i);
});

test("an archived store refuses the message even though it still exists", async () => {
  const archivable = await makeStore("ACTIVE");
  await db.store.update({ where: { id: archivable }, data: { archivedAt: new Date() } });
  const result = await submitInquiry(db, archivable, validInput(), { ipAddress: `1.1.6.${uid()}` });
  assert.equal(result.ok, false);
});

test("an oversized storeId (bypassing the Server Action wrapper's own format check) still rate limits safely, without crashing", async () => {
  // submitInquiry() documents itself as the actual trust boundary, so it
  // must not silently depend on its only current caller
  // (app/(storefront)/actions.ts) having already bounded storeId's
  // length. RateLimit.key has no column length limit, so an unbounded
  // key built from a huge storeId could otherwise trip Postgres's
  // per-index-row size limit.
  const ip = `7.7.4.${uid()}`;
  const hugeStoreId = "x".repeat(5000);
  for (let i = 0; i < 5; i++) {
    const r = await submitInquiry(db, hugeStoreId, validInput(), { ipAddress: ip });
    assert.equal(r.ok, false);
  }
  const sixth = await submitInquiry(db, hugeStoreId, validInput(), { ipAddress: ip });
  assert.equal(sixth.ok, false);
  if (!sixth.ok) assert.match(sixth.error, /too many/i);
});

test("the same store+IP is rate limited after too many messages", async () => {
  // Sequential on purpose: withinRateLimit() is a best-effort, non-atomic
  // read-then-write (documented in lib/server/rate-limit.ts), so firing
  // these concurrently would race and under-count, same as two real
  // messages arriving in the same instant could both pass.
  const ip = `2.2.2.${uid()}`;
  for (let i = 0; i < 5; i++) {
    const r = await submitInquiry(db, activeStore, validInput(), { ipAddress: ip });
    assert.ok(r.ok, JSON.stringify(r));
  }
  const sixth = await submitInquiry(db, activeStore, validInput(), { ipAddress: ip });
  assert.equal(sixth.ok, false);
  if (!sixth.ok) assert.match(sixth.error, /too many/i);
});

test("a different IP at the same store is not affected by another IP's rate limit", async () => {
  const busyIp = `3.3.3.${uid()}`;
  for (let i = 0; i < 5; i++) {
    const r = await submitInquiry(db, activeStore, validInput(), { ipAddress: busyIp });
    assert.ok(r.ok, JSON.stringify(r));
  }
  const blocked = await submitInquiry(db, activeStore, validInput(), { ipAddress: busyIp });
  assert.equal(blocked.ok, false);

  const otherIp = `3.3.4.${uid()}`;
  const stillAllowed = await submitInquiry(db, activeStore, validInput(), { ipAddress: otherIp });
  assert.ok(stillAllowed.ok, JSON.stringify(stillAllowed));
});

test("no IP address (e.g. TRUSTED_IP_HEADER unset) still rate limits, via a shared per-store bucket", async () => {
  // A fresh store, so this test's use of the shared bucket can't be
  // affected by (or affect) any other test's use of the same store.
  const store = await makeStore("ACTIVE");
  for (let i = 0; i < 20; i++) {
    const r = await submitInquiry(db, store, validInput(), { ipAddress: null });
    assert.ok(r.ok, JSON.stringify(r));
  }
  const blocked = await submitInquiry(db, store, validInput(), { ipAddress: null });
  assert.equal(blocked.ok, false);
  if (!blocked.ok) assert.match(blocked.error, /too many/i);
});

test("the shared no-IP bucket and a per-IP bucket for the same store are tracked separately", async () => {
  const store = await makeStore("ACTIVE");
  for (let i = 0; i < 20; i++) {
    const r = await submitInquiry(db, store, validInput(), { ipAddress: null });
    assert.ok(r.ok, JSON.stringify(r));
  }
  assert.equal((await submitInquiry(db, store, validInput(), { ipAddress: null })).ok, false, "shared bucket should now be exhausted");
  // A visitor with a known, trusted IP is not affected by other
  // visitors' use of the shared (no-IP) bucket for the same store.
  const withIp = await submitInquiry(db, store, validInput(), { ipAddress: `5.5.5.${uid()}` });
  assert.ok(withIp.ok, JSON.stringify(withIp));
});

test(
  "storeId is trusted once it names a real, active store — a demo-era design choice, " +
    "not secure domain-based tenant resolution (see the comment on submitInquiry())",
  async () => {
    // submitInquiry() has no way to know which store a visitor "should"
    // be looking at: it only checks that the given storeId names a
    // real, active, non-archived store. So a caller can direct a
    // message to ANY such store, proven here with a store unrelated to
    // any other test in this file.
    const otherActiveStore = await makeStore("ACTIVE");
    const result = await submitInquiry(db, otherActiveStore, validInput(), { ipAddress: `6.6.6.${uid()}` });
    assert.ok(result.ok, JSON.stringify(result));
    const row = await db.inquiry.findUniqueOrThrow({ where: { id: result.data.id } });
    assert.equal(row.storeId, otherActiveStore);
    // Once real per-domain store resolution exists, a NEW public action
    // must derive storeId from the resolved domain SERVER-SIDE instead
    // of trusting a caller-supplied value the way this one does.
  },
);

// Uses setAdminStoreStatus purely to keep the import used and to document
// that reactivating a store restores the contact form immediately.
test("reactivating a store lets its contact form work again", async () => {
  const owner = await testActor(db);
  const store = await makeStore("DRAFT");
  const blocked = await submitInquiry(db, store, validInput(), { ipAddress: `4.4.4.${uid()}` });
  assert.equal(blocked.ok, false);

  const activated = await setAdminStoreStatus(owner, db, store, "ACTIVE");
  assert.ok(activated.ok, JSON.stringify(activated));
  const allowed = await submitInquiry(db, store, validInput(), { ipAddress: `4.4.5.${uid()}` });
  assert.ok(allowed.ok, JSON.stringify(allowed));
});
