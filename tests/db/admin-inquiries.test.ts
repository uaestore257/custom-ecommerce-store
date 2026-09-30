// Admin inbox for contact messages (lib/server/admin/inquiries.ts):
// store-scoped list, and audited Read / Archived status changes. Every
// store here is created fresh. Permission checks for the Server Action are
// in auth-actions.test.ts.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { listAdminInquiries, setAdminInquiryStatus } from "../../lib/server/admin/inquiries";
import { archiveAdminStore, createAdminStore } from "../../lib/server/admin/stores";
import { submitInquiry } from "../../lib/server/inquiries";
import { testActor, testDb, uid } from "./helpers";

const db = testDb();
after(() => db.$disconnect());

let owner: Awaited<ReturnType<typeof testActor>>;
before(async () => {
  owner = await testActor(db);
});

async function makeStore() {
  const result = await createAdminStore(owner, db, {
    name: `Inbox ${uid()}`,
    slug: `inbox-${uid()}`,
    businessType: "furniture",
    status: "ACTIVE",
    ownerName: "Owner",
    ownerEmail: `owner-${uid()}@example.com`,
    ownerPassword: "an inbox owner passphrase 2026",
    countryCode: "AE",
    baseCurrency: "AED",
    timezone: "Asia/Dubai",
    defaultLanguage: "en",
    languages: ["en"],
    accentColor: "#123456",
  });
  assert.ok(result.ok, JSON.stringify(result));
  return result.data.id;
}

/** Sends one message to the store the way the storefront does; each from its own IP so rate limits don't interfere. */
async function sendMessage(storeId: string, subject: string) {
  const result = await submitInquiry(
    db,
    storeId,
    { name: "Jane Visitor", email: "jane@example.com", subject, message: "Do you deliver to Sharjah, and how long does it take?" },
    { ipAddress: `10.20.${uid()}` },
  );
  assert.ok(result.ok, JSON.stringify(result));
  return result.data.id;
}

const statusOf = async (id: string) => (await db.inquiry.findUniqueOrThrow({ where: { id } })).status;
const auditFor = (id: string) => db.auditEvent.findMany({ where: { targetType: "inquiry", targetId: id }, orderBy: { createdAt: "asc" } });

test("the inbox lists only this store's messages, newest first", async () => {
  const store = await makeStore();
  const other = await makeStore();
  const first = await sendMessage(store, "First");
  const second = await sendMessage(store, "Second");
  const foreign = await sendMessage(other, "Other store");

  const list = (await listAdminInquiries(db, store))!;
  assert.deepEqual(list.map((i) => i.id), [second, first]);
  assert.ok(!list.some((i) => i.id === foreign), "another store's message is never listed");
  assert.equal(list[0].subject, "Second");
  assert.equal(list[0].status, "NEW");
  assert.deepEqual(Object.keys(list[0]).sort(), ["createdAt", "email", "id", "message", "name", "status", "subject"]);
});

test("a missing or archived store has no inbox", async () => {
  assert.equal(await listAdminInquiries(db, `missing-${uid()}`), null);
  const store = await makeStore();
  await sendMessage(store, "Before archiving");
  assert.ok((await archiveAdminStore(owner, db, store)).ok);
  assert.equal(await listAdminInquiries(db, store), null);
});

test("a message moves New -> Read -> Archived -> Read, each change audited without message details", async () => {
  const store = await makeStore();
  const id = await sendMessage(store, "Status flow");
  for (const [from, to] of [["NEW", "READ"], ["READ", "ARCHIVED"], ["ARCHIVED", "READ"]] as const) {
    const result = await setAdminInquiryStatus(owner, db, store, id, from, to);
    assert.ok(result.ok, `${from} -> ${to}: ${JSON.stringify(result)}`);
    assert.equal(await statusOf(id), to);
  }
  const events = await auditFor(id);
  assert.deepEqual(events.map((e) => e.action), ["inquiry.status_change", "inquiry.status_change", "inquiry.status_change"]);
  assert.deepEqual(events.map((e) => e.metadata), [
    { from: "NEW", to: "READ" },
    { from: "READ", to: "ARCHIVED" },
    { from: "ARCHIVED", to: "READ" },
  ]);
  assert.ok(events.every((e) => e.actorUserId === owner.userId && e.storeId === store));
  assert.ok(!JSON.stringify(events).includes("jane@example.com"), "no sender details in the audit log");
});

test("a New message can be archived directly", async () => {
  const store = await makeStore();
  const id = await sendMessage(store, "Archive directly");
  assert.ok((await setAdminInquiryStatus(owner, db, store, id, "NEW", "ARCHIVED")).ok);
  assert.equal(await statusOf(id), "ARCHIVED");
});

test("disallowed or unknown changes are refused and nothing changes", async () => {
  const store = await makeStore();
  const id = await sendMessage(store, "Refusals");
  for (const [from, to] of [
    ["NEW", "NEW"],
    ["READ", "NEW"],
    ["NEW", "SPAM"],
    ["new", "read"],
    [null, "READ"],
    ["NEW", { status: "READ" }],
  ] as const) {
    assert.equal((await setAdminInquiryStatus(owner, db, store, id, from, to)).ok, false, JSON.stringify([from, to]));
  }
  assert.equal(await statusOf(id), "NEW");
  assert.equal((await auditFor(id)).length, 0);
});

test("a change based on a stale page is refused", async () => {
  const store = await makeStore();
  const id = await sendMessage(store, "Stale");
  assert.ok((await setAdminInquiryStatus(owner, db, store, id, "NEW", "READ")).ok);
  const stale = await setAdminInquiryStatus(owner, db, store, id, "NEW", "ARCHIVED");
  assert.equal(stale.ok, false);
  if (!stale.ok) assert.match(stale.error, /changed in the meantime/i);
  assert.equal(await statusOf(id), "READ");
  assert.equal((await auditFor(id)).length, 1);
});

test("two admins changing the same message at once: exactly one change applies", async () => {
  const store = await makeStore();
  const id = await sendMessage(store, "Race");
  const results = await Promise.all([
    setAdminInquiryStatus(owner, db, store, id, "NEW", "READ"),
    setAdminInquiryStatus(owner, db, store, id, "NEW", "ARCHIVED"),
    setAdminInquiryStatus(owner, db, store, id, "NEW", "READ"),
  ]);
  assert.equal(results.filter((r) => r.ok).length, 1, JSON.stringify(results));
  assert.equal((await auditFor(id)).length, 1);
});

test("another store's message, or a missing one, is not found and untouched", async () => {
  const store = await makeStore();
  const other = await makeStore();
  const foreign = await sendMessage(other, "Foreign");
  for (const [storeId, id] of [[store, foreign], [store, `missing-${uid()}`], [`missing-${uid()}`, foreign]]) {
    const result = await setAdminInquiryStatus(owner, db, storeId, id, "NEW", "READ");
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /not found|does not exist/i);
  }
  assert.equal(await statusOf(foreign), "NEW");
  assert.equal((await auditFor(foreign)).length, 0);
});
