// Store-scoped read-only customer list (lib/server/admin/customers.ts).
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createAdminStore } from "../../lib/server/admin/stores";
import { listAdminCustomers } from "../../lib/server/admin/customers";
import { testActor, testDb, uid } from "./helpers";

const db = testDb();
after(() => db.$disconnect());

async function makeStore(name: string) {
  const result = await createAdminStore(await testActor(db), db, {
    name: `Customers ${name} ${uid()}`,
    slug: `customers-${name.toLowerCase()}-${uid()}`,
    businessType: "furniture",
    status: "ACTIVE",
    ownerName: "Owner",
    ownerEmail: `customer-owner-${uid()}@example.com`,
    ownerPassword: "a customer test passphrase 2026",
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

test("customer list is read-only, bounded, and scoped to the exact store", async () => {
  const storeA = await makeStore("a");
  const storeB = await makeStore("b");
  const email = `same-${uid()}@example.com`;
  await db.customer.createMany({
    data: [
      { storeId: storeA, name: "Store A customer", email, phone: "+971501234567" },
      { storeId: storeB, name: "Store B customer", email, phone: "+971501234568" },
    ],
  });

  const customersA = await listAdminCustomers(db, storeA);
  const customersB = await listAdminCustomers(db, storeB);
  assert.deepEqual(customersA?.customers.map(({ name }) => name), ["Store A customer"]);
  assert.deepEqual(customersB?.customers.map(({ name }) => name), ["Store B customer"]);
  assert.equal(customersA?.customers[0].orderCount, 0);
  assert.equal(await listAdminCustomers(db, `missing-${uid()}`), null);
});
