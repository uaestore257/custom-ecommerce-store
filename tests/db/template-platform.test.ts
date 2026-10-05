// Phase 3: the template platform against a real database — a new store
// starts on the template chosen at creation; switching an existing store
// through every registered template changes ONLY its presentation (every
// row of every store-scoped table is compared before and after), never
// another store; and the public Work page lists only real, live demo stores.
// Every store here is created fresh.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import type { PrismaClient } from "../../lib/generated/prisma/client";
import { workCategories } from "../../lib/platform/work";
import { listAdminCategories } from "../../lib/server/admin/categories";
import { setStoreDemo, updateStoreDesign } from "../../lib/server/admin/design";
import { createAdminProduct } from "../../lib/server/admin/products";
import { createAdminStore } from "../../lib/server/admin/stores";
import { placeOrder } from "../../lib/server/orders";
import { loadWorkDemoStores } from "../../lib/server/platform/work";
import { getStorefrontContext, getStorefrontProductListing } from "../../lib/server/storefront/catalog";
import { getTemplateDefinition, TEMPLATE_KEYS, type TemplateKey } from "../../lib/templates/registry";
import { testActor, testDb, uid } from "./helpers";

const db = testDb();
after(() => db.$disconnect());

function storeInput(overrides: Record<string, unknown> = {}) {
  return {
    name: `Platform store ${uid()}`,
    slug: `platform-store-${uid()}`,
    businessType: "furniture",
    status: "ACTIVE",
    ownerName: "Owner",
    ownerEmail: `owner-${uid()}@example.com`,
    ownerPassword: "a platform owner passphrase 2026",
    countryCode: "AE",
    baseCurrency: "AED",
    timezone: "Asia/Dubai",
    defaultLanguage: "en",
    languages: ["en"],
    accentColor: "#7a5c3e",
    ...overrides,
  };
}

async function makeStore(overrides: Record<string, unknown> = {}) {
  const result = await createAdminStore(await testActor(db), db, storeInput(overrides));
  assert.ok(result.ok, JSON.stringify(result));
  return result.data.id;
}

async function makeProduct(storeId: string, overrides: Record<string, unknown> = {}) {
  const categoryId = (await listAdminCategories(db, storeId))![0].id;
  const result = await createAdminProduct(db, storeId, {
    name: `Piece ${uid()}`,
    sku: `SKU-${uid()}`.toUpperCase(),
    categoryId,
    description: "Solid oak, hand finished.",
    price: "100.00",
    compareAtPrice: "140.00",
    imageUrl: "",
    stock: "7",
    deliveryFee: "25.00",
    freeDelivery: false,
    pickupOnly: false,
    status: "ACTIVE",
    featured: true,
    ...overrides,
  });
  assert.ok(result.ok, JSON.stringify(result));
  return result.data.id;
}

/** A store with business data in every area a switch could disturb. */
async function populatedStore() {
  const store = await makeStore({ languages: ["en", "ar"] });
  const product = await makeProduct(store);
  await makeProduct(store, { status: "DRAFT", featured: false, compareAtPrice: "" });
  await db.productImage.create({ data: { storeId: store, productId: product, url: "https://example.com/oak.jpg", altText: "Oak chair", position: 0 } });
  await db.storeDomain.create({ data: { storeId: store, hostname: `shop-${uid()}.example.com`, verificationToken: `token-${uid()}` } });
  await db.storeContentTranslation.update({
    where: { storeId_locale: { storeId: store, locale: "en" } },
    data: { tagline: "Made to last", aboutText: "A family workshop.", heroText: "New season." },
  });
  await db.store.update({ where: { id: store }, data: { contactPhone: "+97140000000", logoUrl: "https://example.com/logo.png" } });
  const order = await placeOrder(
    db,
    store,
    {
      storeId: store,
      idempotencyKey: randomUUID(),
      expectedTotalMinor: "25000",
      fulfillmentMethod: "DELIVERY",
      items: [{ productId: product, quantity: 2 }],
      name: "Jane Visitor",
      email: `jane-${uid()}@example.com`,
      phone: "050 123 4567",
      address: "Villa 12, Example Street",
      city: "Dubai",
      paymentMethod: "cash_on_delivery",
    },
    { ipAddress: `10.3.${uid()}` },
  );
  assert.ok(order.ok, JSON.stringify(order));
  return store;
}

const STORE_SCOPED_TABLES = async (client: PrismaClient) =>
  (
    await client.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.columns
      WHERE column_name = 'storeId' AND table_schema = current_schema() AND table_name <> 'AuditEvent'
      ORDER BY table_name`
  ).map((row) => row.table_name);

const json = (value: unknown) => JSON.parse(JSON.stringify(value, (_key, v) => (typeof v === "bigint" ? v.toString() : v)));

/**
 * Every business row of a store: the store row itself (minus the two
 * presentation columns and its update timestamp) and every row of every
 * table with a storeId column — products, variants, images, categories,
 * customers, orders, payments, domains, languages, memberships… The table
 * list comes from the schema, so a new store-scoped table is covered too.
 */
async function businessSnapshot(storeId: string) {
  const row: Record<string, unknown> = { ...(await db.store.findUniqueOrThrow({ where: { id: storeId } })) };
  for (const presentation of ["templateKey", "themeConfig", "updatedAt"]) delete row[presentation];
  const tables: Record<string, unknown> = {};
  for (const table of await STORE_SCOPED_TABLES(db)) {
    tables[table] = json(await db.$queryRawUnsafe(`SELECT * FROM "${table}" WHERE "storeId" = $1 ORDER BY 1`, storeId));
  }
  return { store: json(row), tables };
}

// ---------- New store: template chosen at creation ----------

test("a new store starts on the template chosen at creation; none chosen means the registry default", async () => {
  for (const key of TEMPLATE_KEYS) {
    const store = await makeStore({ templateKey: key });
    assert.equal((await db.store.findUniqueOrThrow({ where: { id: store } })).templateKey, key);
    assert.equal((await getStorefrontContext(db, store))!.store.templateKey, key, `${key} renders immediately`);
    assert.ok(await db.auditEvent.findFirst({ where: { action: "store.create", storeId: store, metadata: { path: ["templateKey"], equals: key } } }));
  }
  const unspecified = await makeStore();
  assert.equal((await db.store.findUniqueOrThrow({ where: { id: unspecified } })).templateKey, "classic");
});

test("store creation rejects a template that is not registered, and creates nothing", async () => {
  for (const templateKey of ["nope", "Atelier", 3, { key: "noor" }]) {
    const slug = `bad-template-${uid()}`;
    const result = await createAdminStore(await testActor(db), db, storeInput({ slug, templateKey }));
    assert.equal(result.ok, false, JSON.stringify(templateKey));
    if (!result.ok) assert.ok(result.fieldErrors?.templateKey, "the template field is flagged");
    assert.equal(await db.store.findUnique({ where: { slug } }), null);
  }
});

// ---------- Switching: presentation only, every template, both directions ----------

test("switching through every template keeps every business row, the store id and the other tenant untouched", async () => {
  const store = await populatedStore();
  const bystander = await populatedStore();
  const actor = (await testActor(db)).userId;
  const baseline = await businessSnapshot(store);
  const bystanderBaseline = await businessSnapshot(bystander);
  const bystanderDesign = await db.store.findUniqueOrThrow({ where: { id: bystander }, select: { templateKey: true, themeConfig: true } });
  assert.ok((baseline.tables.Order as unknown[]).length === 1 && (baseline.tables.Customer as unknown[]).length === 1, "the store has an order and a customer");

  const forward: TemplateKey[] = ["atelier", "kinetic", "maison", "market", "noor", "classic"];
  const backward: TemplateKey[] = ["noor", "market", "maison", "kinetic", "atelier", "classic"];
  for (const target of [...forward, ...backward]) {
    const result = await updateStoreDesign(db, store, actor, { templateKey: target, theme: {} });
    assert.ok(result.ok, `${target}: ${JSON.stringify(result)}`);
    const row = await db.store.findUniqueOrThrow({ where: { id: store }, select: { id: true, templateKey: true } });
    assert.deepEqual(row, { id: store, templateKey: target });
    const context = (await getStorefrontContext(db, store))!;
    assert.equal(context.store.id, store);
    assert.equal(context.store.templateKey, target, `${target} renders`);
    assert.equal((await getStorefrontProductListing(db, store, null, { page: 1, sort: "featured", q: "" }))!.products.length, 1, `${target}: catalogue intact`);
    assert.deepEqual(await businessSnapshot(store), baseline, `${target}: every business row unchanged`);
    assert.deepEqual(await businessSnapshot(bystander), bystanderBaseline, `${target}: the other store is untouched`);
  }
  assert.deepEqual(await db.store.findUniqueOrThrow({ where: { id: bystander }, select: { templateKey: true, themeConfig: true } }), bystanderDesign);
  assert.equal(await db.auditEvent.count({ where: { action: "store.design_update", storeId: store } }), forward.length + backward.length);
  assert.equal(await db.auditEvent.count({ where: { action: "store.design_update", storeId: bystander } }), 0);
});

test("theme options never travel to an incompatible template; switching back is reversible", async () => {
  const store = await makeStore();
  const actor = (await testActor(db)).userId;
  assert.ok((await updateStoreDesign(db, store, actor, { templateKey: "atelier", theme: { palette: "charcoal" } })).ok);
  // Atelier's "charcoal" palette is not a Market palette: refused, nothing changes.
  const refused = await updateStoreDesign(db, store, actor, { templateKey: "market", theme: { palette: "charcoal" } });
  assert.equal(refused.ok, false);
  assert.equal((await db.store.findUniqueOrThrow({ where: { id: store } })).templateKey, "atelier");
  // Switching with the target's own (default) options replaces — never merges — the old options.
  const market = await updateStoreDesign(db, store, actor, { templateKey: "market", theme: {} });
  assert.ok(market.ok);
  const marketDefaults = Object.fromEntries(
    Object.entries(getTemplateDefinition("market").theme.options).map(([key, option]) => [key, option.default]),
  );
  assert.deepEqual((await db.store.findUniqueOrThrow({ where: { id: store } })).themeConfig, marketDefaults);
  // And back again.
  assert.ok((await updateStoreDesign(db, store, actor, { templateKey: "atelier", theme: { palette: "charcoal" } })).ok);
  const context = (await getStorefrontContext(db, store))!;
  assert.equal(context.store.templateKey, "atelier");
  assert.equal(context.store.theme.palette, "charcoal");
});

// ---------- Work: only real, live demo stores ----------

const url = (slug: string) => `https://${slug}.demo.example/`;

test("Work lists only ACTIVE demo stores with a registered template, a Services industry and live products", async () => {
  const actor = await testActor(db);
  const tag = uid();
  const demo = async (overrides: Record<string, unknown>, withProduct = true) => {
    const store = await makeStore({ name: `Work ${tag} ${uid()}`, ...overrides });
    if (withProduct) await makeProduct(store);
    assert.ok((await setStoreDemo(actor, db, store, true)).ok);
    return store;
  };
  const furniture = await demo({ businessType: "furniture", templateKey: "atelier" });
  const fashion = await demo({ businessType: "fashion", templateKey: "maison" });
  const client = await makeStore({ name: `Work ${tag} client`, businessType: "beauty" });
  await makeProduct(client); // a client store: never a demo
  const draft = await demo({ businessType: "grocery", status: "DRAFT" });
  const empty = await demo({ businessType: "electronics" }, false); // no live products
  const other = await demo({ businessType: "other" }); // not a Services industry
  const archived = await demo({ businessType: "beauty" });
  await db.store.update({ where: { id: archived }, data: { archivedAt: new Date() } });
  const unknownTemplate = await demo({ businessType: "beauty" });
  await db.store.update({ where: { id: unknownTemplate }, data: { templateKey: "retired" } });

  const listed = (await loadWorkDemoStores(db, url)).filter((store) => store.name.startsWith(`Work ${tag}`));
  const names = new Map(
    await Promise.all(
      [furniture, fashion, client, draft, empty, other, archived, unknownTemplate].map(async (id) => [id, (await db.store.findUniqueOrThrow({ where: { id } })).name] as const),
    ),
  );
  assert.deepEqual(listed.map((store) => store.name).sort(), [names.get(furniture), names.get(fashion)].sort());
  for (const store of listed) {
    assert.deepEqual(Object.keys(store).sort(), ["industry", "name", "tagline", "templateKey", "templateName", "url"], "presentation facts only");
  }
  assert.equal(listed.find((store) => store.name === names.get(fashion))!.templateName, "Maison");

  // A demo whose host has no storefront URL gets no View Live link — and so isn't listed.
  assert.equal((await loadWorkDemoStores(db, () => null)).length, 0);
});

test("a Work category appears only with a live demo, and follows the demo's template when it is switched", async () => {
  const actor = await testActor(db);
  const tag = uid();
  const store = await makeStore({ name: `Category ${tag}`, businessType: "electronics", templateKey: "kinetic" });
  await makeProduct(store);
  const mine = async () =>
    workCategories((await loadWorkDemoStores(db, url)).filter((demo) => demo.name === `Category ${tag}`));

  assert.deepEqual(await mine(), [], "not a demo yet: no category");
  assert.ok((await setStoreDemo(actor, db, store, true)).ok);
  let categories = await mine();
  assert.deepEqual(categories.map((category) => category.slug), ["electronics"]);
  assert.equal(categories[0].title, "Electronics");
  assert.equal(categories[0].demos[0].templateKey, "kinetic");
  const slug = (await db.store.findUniqueOrThrow({ where: { id: store } })).slug;
  assert.equal(categories[0].demos[0].url, url(slug), "View Live is the store's own storefront");

  assert.ok((await updateStoreDesign(db, store, actor.userId, { templateKey: "noor", theme: {} })).ok);
  categories = await mine();
  assert.equal(categories[0].demos[0].templateKey, "noor");
  assert.equal(categories[0].demos[0].templateName, "Noor");

  assert.ok((await setStoreDemo(actor, db, store, false)).ok);
  assert.deepEqual(await mine(), [], "no longer a demo: the category disappears");
});
