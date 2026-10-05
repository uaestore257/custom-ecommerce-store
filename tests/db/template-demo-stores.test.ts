// Provisioning the template demo stores (lib/server/template-demo-stores.ts)
// against a real database: creates only what is missing, is idempotent,
// never touches a client store, and the stores it creates are live demos
// on the right template.
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { loadWorkDemoStores } from "../../lib/server/platform/work";
import { getStorefrontContext } from "../../lib/server/storefront/catalog";
import { provisionTemplateDemoStores } from "../../lib/server/template-demo-stores";
import { TEMPLATE_DEMO_STORES, type DemoStoreSpec } from "../../lib/template-demo-stores";
import type { TemplateKey } from "../../lib/templates/registry";
import { testActor, testDb, uid } from "./helpers";

const db = testDb();
after(() => db.$disconnect());

/** The real specs under fresh slugs, so this test never collides with the seeded stores. */
function freshSpecs(tag: string): Record<TemplateKey, DemoStoreSpec> {
  return Object.fromEntries(
    Object.entries(TEMPLATE_DEMO_STORES).map(([key, spec]) => [key, { ...spec, slug: `${spec.slug}-${tag}` }]),
  ) as Record<TemplateKey, DemoStoreSpec>;
}

test("a dry run writes nothing; a real run creates each missing demo store once, on its template", async () => {
  const tag = uid();
  const specs = freshSpecs(tag);
  // The seeded Threadline (Classic) and Nest & Oak (Atelier) demos already cover those templates.
  const storesBefore = await db.store.count();
  const plan = await provisionTemplateDemoStores(db, { specs, dryRun: true });
  assert.equal(await db.store.count(), storesBefore, "dry run writes nothing");
  assert.ok(plan.every((result) => ["would-create", "exists", "template-has-demo"].includes(result.outcome)), JSON.stringify(plan));
  const outcome = (results: typeof plan) => Object.fromEntries(results.map((result) => [result.template, result.outcome]));

  // Archive whatever demos other tests left for the four new templates, so this run decides alone.
  await db.store.updateMany({ where: { isDemo: true, templateKey: { in: ["kinetic", "maison", "market", "noor"] }, archivedAt: null }, data: { archivedAt: new Date() } });
  const actor = await testActor(db);
  const created = await provisionTemplateDemoStores(db, { specs, actorUserId: actor.userId });
  assert.deepEqual(outcome(created), {
    classic: "template-has-demo",
    atelier: "template-has-demo",
    kinetic: "created",
    maison: "created",
    market: "created",
    noor: "created",
  });
  for (const key of ["kinetic", "maison", "market", "noor"] as const) {
    const spec = specs[key];
    const store = await db.store.findUniqueOrThrow({ where: { slug: spec.slug }, include: { _count: { select: { products: true, memberships: true } } } });
    assert.equal(store.templateKey, key);
    assert.equal(store.isDemo, true);
    assert.equal(store.status, "ACTIVE");
    assert.equal(store.workServiceSlug, spec.workServiceSlug, `${key}: explicit Work category is set during provisioning`);
    assert.equal(store._count.products, spec.products.length);
    assert.equal(store._count.memberships, 0, "a demo store has no owner account");
    assert.equal(await db.productTranslation.count({ where: { storeId: store.id } }), spec.products.length, `${key}: product translations reference the store`);
    assert.equal(await db.productVariant.count({ where: { storeId: store.id } }), spec.products.length, `${key}: products have their default variants`);
    const context = (await getStorefrontContext(db, store.id))!;
    assert.equal(context.store.templateKey, key);
    assert.deepEqual(context.store.paymentMethods, ["cash_on_delivery"], "no online payment on a demo store");
    assert.ok(await db.auditEvent.findFirst({ where: { action: "store.demo_provision", storeId: store.id, actorUserId: actor.userId } }), "audited with who asked");
  }
  const noor = (await getStorefrontContext(db, (await db.store.findUniqueOrThrow({ where: { slug: specs.noor.slug } })).id))!;
  assert.equal(noor.store.language, "ar");
  assert.equal(noor.store.direction, "rtl");
  assert.ok(noor.categories.every((category) => /^[a-z0-9-]+$/.test(category.slug)), "Latin URL segments for Arabic categories");

  const demos = (await loadWorkDemoStores(db, (slug) => `https://${slug}.example/`)).map((demo) => demo.templateKey);
  for (const key of ["kinetic", "maison", "market", "noor"]) assert.ok(demos.includes(key as TemplateKey), `${key} appears in Work`);

  const again = await provisionTemplateDemoStores(db, { specs });
  assert.ok(again.every((result) => result.outcome === "exists" || result.outcome === "template-has-demo"), JSON.stringify(again));
  assert.equal(await db.store.count({ where: { slug: { in: Object.values(specs).map((spec) => spec.slug) } } }), 4, "re-running creates nothing");
});

test("a client store that already uses the preferred demo slug is never touched and gets a separate demo", async () => {
  const tag = uid();
  const specs = freshSpecs(tag);
  await db.store.updateMany({ where: { isDemo: true, templateKey: "kinetic", archivedAt: null }, data: { archivedAt: new Date() } });
  const client = await db.store.create({
    data: {
      slug: specs.kinetic.slug,
      name: "A real client",
      status: "ACTIVE",
      countryCode: "AE",
      baseCurrency: "AED",
      timezone: "Asia/Dubai",
      defaultLanguage: "en",
      languages: { create: [{ languageCode: "en" }] },
    },
  });
  const before = await db.store.findUniqueOrThrow({ where: { id: client.id } });
  const results = await provisionTemplateDemoStores(db, { specs });
  const kinetic = results.find((result) => result.template === "kinetic")!;
  assert.equal(kinetic.outcome, "created");
  assert.equal(kinetic.slug, `${specs.kinetic.slug}-demo`);
  assert.deepEqual(await db.store.findUniqueOrThrow({ where: { id: client.id } }), before, "the client store is unchanged");
  assert.equal(await db.product.count({ where: { storeId: client.id } }), 0);
  const demo = await db.store.findUniqueOrThrow({ where: { slug: kinetic.slug } });
  assert.equal(demo.isDemo, true);
  assert.equal(demo.templateKey, "kinetic");
});

test("an invalid spec writes nothing", async () => {
  const tag = uid();
  const specs = freshSpecs(tag);
  await db.store.updateMany({ where: { isDemo: true, templateKey: "maison", archivedAt: null }, data: { archivedAt: new Date() } });
  specs.maison = { ...specs.maison, products: [{ ...specs.maison.products[0], description: "short" }] };
  const results = await provisionTemplateDemoStores(db, { specs, dryRun: false });
  const maison = results.find((result) => result.template === "maison")!;
  assert.equal(maison.outcome, "invalid");
  assert.equal(await db.store.findUnique({ where: { slug: specs.maison.slug } }), null);
});
