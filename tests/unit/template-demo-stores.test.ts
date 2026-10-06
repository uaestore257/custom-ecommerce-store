// One demonstration store per registered template (lib/template-demo-stores.ts):
// complete, valid by the admin's own product rules, and free of claims.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { hasErrors, validateProduct } from "../../lib/admin/validation";
import { STORE_TYPES } from "../../lib/config";
import { SERVICE_CATEGORIES } from "../../lib/platform/services";
import { TEMPLATE_DEMO_STORES } from "../../lib/template-demo-stores";
import { getTemplateDefinition, TEMPLATE_KEYS } from "../../lib/templates/registry";
import { isSlug } from "../../lib/validation";
import { setStoreDemo } from "../../lib/server/admin/design";
import { provisionTemplateDemoStores } from "../../lib/server/template-demo-stores";
import type { PrismaClient } from "../../lib/generated/prisma/client";
import type { PlatformOwner } from "../../lib/server/auth/guards";

const specs = TEMPLATE_KEYS.map((key) => [key, TEMPLATE_DEMO_STORES[key]] as const);

test("every registered template has exactly one demo store, each with its own slug", () => {
  assert.deepEqual(Object.keys(TEMPLATE_DEMO_STORES).sort(), [...TEMPLATE_KEYS].sort());
  const slugs = specs.map(([, spec]) => spec.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const [key, spec] of specs) {
    assert.ok(isSlug(spec.slug), `${key}: ${spec.slug}`);
    assert.ok(STORE_TYPES.some((type) => type.value === spec.businessType), key);
    assert.ok(SERVICE_CATEGORIES.some((category) => category.slug === spec.workServiceSlug), `${key}: explicit Work category`);
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
  const removeAction = actions.slice(actions.indexOf("export async function setStoreDemoAction"));
  assert.match(removeAction.slice(0, 300), /asPlatformOwner\("setStoreDemo"/);
  const page = readFileSync(new URL("../../app/admin/template/page.tsx", import.meta.url), "utf8");
  assert.match(page, /requireAdminPage\(\)/, "the Templates page itself is platform-owner only");
});

interface FakeStore {
  slug: string;
  isDemo: boolean;
  templateKey: string;
  status: string;
  workServiceSlug: string | null;
  productCount: number;
  paymentMethods: { method: string; enabled: boolean }[];
}

function memoryPrisma(failSlug?: string) {
  const stores = new Map<string, FakeStore>();
  const categoryRows = new Map<string, { id: string; storeId: string }>();
  const productRows = new Map<string, { id: string; storeId: string; categoryId: string | null }>();
  const productTranslations: { productId: string; storeId: string; locale: string }[] = [];
  const variants: { productId: string; storeId: string }[] = [];
  let nextId = 0;
  const db = {
    currency: { findUnique: async () => ({ minorUnits: 2 }) },
    country: { findUnique: async () => ({ code: "AE" }) },
    language: { findMany: async ({ where }: { where: { code: { in: string[] } } }) => where.code.in.map((code) => ({ code })) },
    store: {
      findUnique: async ({ where }: { where: { slug: string } }) => {
        const store = stores.get(where.slug);
        return store ? { isDemo: store.isDemo, templateKey: store.templateKey } : null;
      },
      findFirst: async ({ where }: { where: { templateKey: string } }) =>
        [...stores.values()].find((store) => store.isDemo && store.templateKey === where.templateKey) ?? null,
    },
    $transaction: async <T>(callback: (tx: unknown) => Promise<T>) => {
      const pending = new Map<string, FakeStore>();
      const pendingCategories: { id: string; storeId: string }[] = [];
      const pendingProducts: { id: string; storeId: string; categoryId: string | null }[] = [];
      const pendingTranslations: { productId: string; storeId: string; locale: string }[] = [];
      const pendingVariants: { productId: string; storeId: string }[] = [];
      let currentStore: FakeStore | undefined;
      const tx = {
        store: {
          create: async ({ data }: { data: { slug: string; isDemo: boolean; templateKey: string; status: string; workServiceSlug: string | null } }) => {
            if (data.slug === failSlug) throw new Error("Injected transaction failure");
            currentStore = { ...data, productCount: 0, paymentMethods: [] };
            pending.set(data.slug, currentStore);
            return { id: `store-${++nextId}` };
          },
        },
        storeContentTranslation: { create: async () => undefined },
        category: {
          createMany: async ({ data }: { data: { id: string; storeId: string }[] }) => {
            pendingCategories.push(...data);
          },
        },
        categoryTranslation: {
          createMany: async ({ data }: { data: { categoryId: string; storeId: string; locale: string }[] }) => {
            for (const row of data) {
              assert.ok(pendingCategories.some((category) => category.id === row.categoryId && category.storeId === row.storeId));
            }
          },
        },
        product: {
          createMany: async ({ data }: { data: { id: string; storeId: string; categoryId: string | null }[] }) => {
            for (const row of data) {
              assert.ok(pendingCategories.some((category) => category.id === row.categoryId && category.storeId === row.storeId));
            }
            pendingProducts.push(...data);
            if (currentStore) currentStore.productCount += data.length;
          },
        },
        productTranslation: {
          createMany: async ({ data }: { data: { productId: string; storeId: string; locale: string }[] }) => {
            for (const row of data) {
              assert.ok(pendingProducts.some((product) => product.id === row.productId && product.storeId === row.storeId));
            }
            pendingTranslations.push(...data);
          },
        },
        productVariant: {
          createMany: async ({ data }: { data: { productId: string; storeId: string }[] }) => {
            for (const row of data) {
              assert.ok(pendingProducts.some((product) => product.id === row.productId && product.storeId === row.storeId));
            }
            pendingVariants.push(...data);
          },
        },
        storePaymentMethod: {
          createMany: async ({ data }: { data: { method: string; enabled: boolean }[] }) => {
            if (currentStore) currentStore.paymentMethods = data;
          },
        },
        auditEvent: { create: async () => undefined },
      };
      const result = await callback(tx);
      for (const [slug, store] of pending) stores.set(slug, store);
      for (const row of pendingCategories) categoryRows.set(row.id, row);
      for (const row of pendingProducts) productRows.set(row.id, row);
      productTranslations.push(...pendingTranslations);
      variants.push(...pendingVariants);
      return result;
    },
  };
  return { client: db as unknown as PrismaClient, stores, categoryRows, productRows, productTranslations, variants };
}

test("provisioning creates all six demo stores idempotently with demo-safe defaults", async () => {
  const { client, stores, categoryRows, productRows, productTranslations, variants } = memoryPrisma();
  const first = await provisionTemplateDemoStores(client);
  assert.equal(first.filter((result) => result.outcome === "created").length, TEMPLATE_KEYS.length);
  assert.equal(stores.size, 6);
  for (const [template, spec] of specs) {
    const store = stores.get(spec.slug)!;
    assert.equal(store.isDemo, true, template);
    assert.equal(store.status, "ACTIVE", template);
    assert.equal(store.templateKey, template);
    assert.equal(store.workServiceSlug, spec.workServiceSlug, `${template}: explicit Work category persisted`);
    assert.equal(store.productCount, spec.products.length, template);
    assert.deepEqual(
      store.paymentMethods.filter((method) => method.enabled).map((method) => method.method),
      ["cash_on_delivery"],
      template,
    );
    const productIds = [...productRows.values()].filter((product) => product.storeId === `store-${TEMPLATE_KEYS.indexOf(template) + 1}`);
    assert.equal(productIds.length, spec.products.length, `${template}: all parent products inserted`);
    assert.equal(
      productTranslations.filter((translation) => productIds.some((product) => product.id === translation.productId && product.storeId === translation.storeId)).length,
      spec.products.length,
      `${template}: each translation has a valid composite Product FK`,
    );
    assert.equal(
      variants.filter((variant) => productIds.some((product) => product.id === variant.productId && product.storeId === variant.storeId)).length,
      spec.products.length,
      `${template}: each product has its matching variant`,
    );
  }
  assert.ok(categoryRows.size > 0);
  assert.ok(TEMPLATE_DEMO_STORES.market.products.length > 0, "Market is covered by the relational assertions");
  assert.ok(TEMPLATE_DEMO_STORES.noor.products.length > 0, "Noor is covered by the relational assertions");
  const second = await provisionTemplateDemoStores(client);
  assert.equal(second.filter((result) => result.outcome === "exists").length, TEMPLATE_KEYS.length);
  assert.equal(stores.size, 6, "repeated execution does not recreate stores");
});

test("provisioning skips an existing demo and creates only the missing templates", async () => {
  const { client, stores } = memoryPrisma();
  const existingSpec = TEMPLATE_DEMO_STORES.classic;
  const existing = {
    slug: existingSpec.slug,
    isDemo: true,
    templateKey: "classic",
    status: "ACTIVE",
    workServiceSlug: existingSpec.workServiceSlug,
    productCount: existingSpec.products.length,
    paymentMethods: [{ method: "cash_on_delivery", enabled: true }],
  };
  stores.set(existing.slug, existing);
  const results = await provisionTemplateDemoStores(client);
  assert.equal(results.find((result) => result.template === "classic")?.outcome, "exists");
  assert.equal(results.filter((result) => result.outcome === "created").length, TEMPLATE_KEYS.length - 1);
  assert.equal(stores.size, TEMPLATE_KEYS.length);
  assert.equal(stores.get(existing.slug), existing, "the existing demo is reused unchanged");
});

test("a provisioning failure for one template is reported without stopping later templates", async () => {
  const failedSlug = TEMPLATE_DEMO_STORES.kinetic.slug;
  const { client, stores } = memoryPrisma(failedSlug);
  const errors: unknown[][] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => errors.push(args);
  try {
    const results = await provisionTemplateDemoStores(client);
    assert.equal(results.find((result) => result.template === "kinetic")?.outcome, "failed");
    assert.equal(results.filter((result) => result.outcome === "created").length, TEMPLATE_KEYS.length - 1);
    assert.equal(stores.size, TEMPLATE_KEYS.length - 1);
    assert.equal(errors.length, 1, "the underlying exception is logged for diagnosis");
  } finally {
    console.error = originalError;
  }
});

test("a client store occupying a preferred demo slug gets a separate demo while remaining untouched", async () => {
  const { client, stores } = memoryPrisma();
  const clientStore = {
    slug: TEMPLATE_DEMO_STORES.classic.slug,
    isDemo: false,
    templateKey: "classic",
    status: "ACTIVE",
    workServiceSlug: null,
    productCount: 7,
    paymentMethods: [],
  };
  stores.set(clientStore.slug, clientStore);
  const alternateClientStore = {
    ...clientStore,
    slug: `${clientStore.slug}-demo`,
    name: "Another real client",
  };
  stores.set(alternateClientStore.slug, alternateClientStore);
  const results = await provisionTemplateDemoStores(client);
  const classic = results.find((result) => result.template === "classic");
  assert.equal(classic?.outcome, "created");
  assert.equal(classic?.slug, `${clientStore.slug}-demo-2`);
  assert.equal(stores.get(clientStore.slug), clientStore, "the client store is not changed");
  assert.equal(stores.get(alternateClientStore.slug), alternateClientStore, "the alternate-slug client store is not changed");
  assert.equal(stores.get(classic!.slug)?.isDemo, true);
  assert.equal(results.filter((result) => result.outcome === "created").length, TEMPLATE_KEYS.length);
});

test("removing a demo updates only isDemo and records the platform-owner audit event", async () => {
  const store = {
    id: "store-1",
    isDemo: true,
    name: "Sample Store",
    businessType: "furniture",
    workServiceSlug: "ecommerce",
    productIds: ["product-1"],
    orderIds: ["order-1"],
    settings: { currency: "AED" },
  };
  const before = structuredClone(store);
  const updates: { where: { id: string; archivedAt: null }; data: { isDemo: boolean } }[] = [];
  const audits: { data: { action: string; actorUserId: string | null; storeId: string | null; metadata: unknown } }[] = [];
  const tx = {
    store: {
      updateMany: async (input: (typeof updates)[number]) => {
        updates.push(input);
        store.isDemo = input.data.isDemo;
        return { count: 1 };
      },
    },
    auditEvent: { create: async (input: (typeof audits)[number]) => audits.push(input) },
  };
  const client = {
    $transaction: async <T>(callback: (transaction: unknown) => Promise<T>) => callback(tx),
  } as unknown as PrismaClient;
  const actor = { userId: "platform-owner" } as unknown as PlatformOwner;

  const result = await setStoreDemo(actor, client, store.id, false);

  assert.equal(result.ok, true);
  assert.deepEqual(updates, [{ where: { id: store.id, archivedAt: null }, data: { isDemo: false } }]);
  assert.deepEqual(store, { ...before, isDemo: false }, "all unrelated Store and tenant data stays intact");
  assert.deepEqual(audits, [{
    data: {
      action: "store.demo_flag",
      actorUserId: actor.userId,
      storeId: store.id,
      targetType: "store",
      targetId: store.id,
      metadata: { isDemo: false },
      ipAddress: null,
    },
  }]);
});
