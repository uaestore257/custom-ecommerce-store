// One demonstration store per registered template (lib/template-demo-stores.ts):
// complete, valid by the admin's own product rules, and free of claims.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { hasErrors, validateProduct } from "../../lib/admin/validation";
import { STORE_TYPES } from "../../lib/config";
import { TEMPLATE_DEMO_STORES } from "../../lib/template-demo-stores";
import { getTemplateDefinition, TEMPLATE_KEYS } from "../../lib/templates/registry";
import { isSlug } from "../../lib/validation";

const specs = TEMPLATE_KEYS.map((key) => [key, TEMPLATE_DEMO_STORES[key]] as const);

test("every registered template has exactly one demo store, each with its own slug", () => {
  assert.deepEqual(Object.keys(TEMPLATE_DEMO_STORES).sort(), [...TEMPLATE_KEYS].sort());
  const slugs = specs.map(([, spec]) => spec.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const [key, spec] of specs) {
    assert.ok(isSlug(spec.slug), `${key}: ${spec.slug}`);
    assert.ok(STORE_TYPES.some((type) => type.value === spec.businessType), key);
    assert.ok(spec.languages.includes(spec.defaultLanguage), key);
    assert.match(spec.contactPhone, /^\+[1-9]\d{6,14}$/, key);
    assert.match(spec.contactEmail, /@[a-z0-9-]+\.example$/, `${key}: example contacts only`);
    assert.match(spec.accentColor, /^#[0-9a-f]{6}$/i, key);
  }
  assert.equal(TEMPLATE_DEMO_STORES.classic.slug, "threadline", "Classic reuses the seeded fashion store");
  assert.equal(TEMPLATE_DEMO_STORES.atelier.slug, "nest-and-oak", "Atelier reuses the seeded furniture store");
});

test("every demo product passes the admin's product validation and sits in a store category", () => {
  for (const [key, spec] of specs) {
    const categories = spec.categories.map((category) => category.name);
    assert.ok(spec.products.filter((product) => (product.status ?? "ACTIVE") === "ACTIVE").length >= 3, `${key}: enough live products`);
    assert.equal(new Set(spec.products.map((product) => product.sku)).size, spec.products.length, `${key}: unique SKUs`);
    for (const product of spec.products) {
      assert.ok(categories.includes(product.category), `${key} ${product.sku}: category`);
      const { errors } = validateProduct(
        {
          ...product,
          categoryId: "category",
          compareAtPrice: product.compareAtPrice ?? "",
          stock: String(product.stock),
          deliveryFee: product.deliveryFee ?? "0",
          imageUrl: "",
          freeDelivery: false,
          pickupOnly: false,
          status: product.status ?? "ACTIVE",
        },
        2,
      );
      assert.ok(!hasErrors(errors), `${key} ${product.sku}: ${JSON.stringify(errors)}`);
    }
  }
});

test("Market has enough categories for shelves; Noor's store is Arabic with Latin URL segments", () => {
  const market = TEMPLATE_DEMO_STORES.market;
  const shelved = market.categories.filter((category) => market.products.some((product) => product.category === category.name && (product.status ?? "ACTIVE") === "ACTIVE"));
  assert.ok(shelved.length >= 3, "several category shelves on the Market homepage");
  const noor = TEMPLATE_DEMO_STORES.noor;
  assert.equal(noor.defaultLanguage, "ar");
  assert.ok(getTemplateDefinition("noor").manifest.capabilities.uiLocales.includes("ar"));
  const arabic = /[؀-ۿ]/;
  for (const text of [noor.name, noor.content.heroTitle, ...noor.categories.map((c) => c.name), ...noor.products.map((p) => p.name)]) {
    assert.match(text, arabic, text);
  }
  for (const item of [...noor.categories, ...noor.products]) assert.ok(item.slug && isSlug(item.slug), `${item.name}: needs a Latin URL segment`);
});

test("demo copy makes no certification, guarantee or superlative claims", () => {
  const text = specs
    .flatMap(([, spec]) => [spec.content.tagline, spec.content.heroTitle, spec.content.heroText, spec.content.aboutText, ...spec.products.flatMap((p) => [p.name, p.description])])
    .join("\n")
    .toLowerCase();
  for (const claim of ["certified", "guarantee", "best ", "#1", "100%", "organic", "authentic", "award", "مضمون", "ضمان", "الأفضل", "أصلي", "طبيعي"]) {
    assert.ok(!text.includes(claim), claim);
  }
});

test("the admin button runs only for the platform owner and records who pressed it", () => {
  const actions = readFileSync(new URL("../../app/admin/actions.ts", import.meta.url), "utf8");
  const body = actions.slice(actions.indexOf("export async function provisionTemplateDemoStoresAction"));
  assert.match(body.slice(0, 400), /asPlatformOwner\("provisionTemplateDemoStores"/);
  assert.match(body.slice(0, 400), /actorUserId: owner\.userId/);
  const page = readFileSync(new URL("../../app/admin/template/page.tsx", import.meta.url), "utf8");
  assert.match(page, /requireAdminPage\(\)/, "the Templates page itself is platform-owner only");
});
