// Phase 3: new-store template choice, the public Work page's categories
// (read from Services, filtered by live demo stores) and the guarantee that
// no storefront — demo or client — can take a live payment.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { validateStoreBase } from "../../lib/admin/validation";
import { STORE_TYPES } from "../../lib/config";
import { SERVICE_CATEGORIES } from "../../lib/platform/services";
import {
  INDUSTRY_SERVICE_ITEM,
  industryTitle,
  isIndustryType,
  WORK_SERVICE_SLUG,
  workCategories,
  type IndustryType,
  type WorkDemoStore,
} from "../../lib/platform/work";
import { isOnlinePaymentMethodAvailable } from "../../lib/server/payments/methods";
import { DEFAULT_TEMPLATE_KEY, TEMPLATE_KEYS } from "../../lib/templates/registry";

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

// ---------- Services stays exactly as it is ----------

test("Services keeps its categories, order and items (Work only reads them)", () => {
  assert.deepEqual(
    SERVICE_CATEGORIES.map((category) => [category.slug, category.title]),
    [
      ["ecommerce", "Ecommerce"],
      ["websites", "Websites"],
      ["apps", "Mobile apps"],
      ["ai", "AI solutions"],
      ["automation", "Automation"],
      ["growth", "SEO & growth"],
      ["software", "Custom software"],
      ["integrations", "Integrations"],
      ["support", "Ongoing support"],
    ],
  );
  const ecommerce = SERVICE_CATEGORIES.find((category) => category.slug === "ecommerce")!;
  assert.deepEqual(ecommerce.items.slice(0, 6), [
    "Custom ecommerce stores",
    "Furniture ecommerce",
    "Fashion ecommerce",
    "Electronics ecommerce",
    "Beauty ecommerce",
    "Food & grocery ecommerce",
  ]);
  // The Services page renders every category, unfiltered — nothing about demos.
  const page = read("components/platform/site/pages/ServicesPage.tsx");
  assert.ok(page.includes("SERVICE_CATEGORIES.map("));
  assert.ok(!/from "[^"]*(work|showcase|server)[^"]*"/.test(page), "Services does not depend on Work, demo stores or the database");
});

// ---------- Work reads Services ----------

test("every Work industry is an item Services really lists, and every store type but 'other' has one", () => {
  const ecommerce = SERVICE_CATEGORIES.find((category) => category.slug === WORK_SERVICE_SLUG)!;
  for (const item of Object.values(INDUSTRY_SERVICE_ITEM)) assert.ok(ecommerce.items.includes(item), item);
  assert.deepEqual(
    Object.keys(INDUSTRY_SERVICE_ITEM).sort(),
    STORE_TYPES.map((type) => type.value).filter((value) => value !== "other").sort(),
  );
  assert.equal(isIndustryType("furniture"), true);
  assert.equal(isIndustryType("other"), false);
  assert.equal(isIndustryType("toString"), false, "no prototype keys");
  assert.equal(industryTitle("Food & grocery ecommerce"), "Food & grocery");
});

const demo = (name: string, industry: IndustryType): WorkDemoStore => ({
  name,
  industry,
  templateKey: "classic",
  templateName: "Classic",
  tagline: null,
  url: `https://${name.toLowerCase()}.example/`,
});

test("Work shows a category only when it has a demo, in Services order, each with only its own demos", () => {
  assert.deepEqual(workCategories([]), [], "no demos: no categories, no empty states");
  const categories = workCategories([
    demo("Oak", "furniture"),
    demo("Volt", "electronics"),
    demo("Linen", "fashion"),
    demo("Teak", "furniture"),
  ]);
  assert.deepEqual(
    categories.map((category) => [category.slug, category.title, category.demos.map((d) => d.name)]),
    [
      ["furniture", "Furniture", ["Oak", "Teak"]],
      ["fashion", "Fashion", ["Linen"]],
      ["electronics", "Electronics", ["Volt"]],
    ],
  );
  assert.ok(!categories.some((category) => category.slug === "beauty" || category.slug === "grocery"), "no demo, no category");
  for (const category of categories) {
    assert.ok(category.demos.every((d) => d.industry === category.slug));
    assert.ok(SERVICE_CATEGORIES[0].items.includes(category.serviceItem));
  }
});

test("Work never invents a category: it follows whatever Services lists", () => {
  const renamed = SERVICE_CATEGORIES.map((category) =>
    category.slug === "ecommerce" ? { ...category, items: category.items.filter((item) => item !== "Fashion ecommerce") } : category,
  );
  assert.deepEqual(workCategories([demo("Linen", "fashion")], renamed), [], "an industry Services stops listing leaves Work too");
  assert.deepEqual(workCategories([demo("Oak", "furniture")], []), [], "no Services ecommerce category: nothing");
});

test("the Work page reads demos through the server allow-list, never a store id from the request", () => {
  const loader = read("lib/server/platform/work.ts");
  assert.match(loader, /isDemo: true/);
  assert.match(loader, /status: "ACTIVE"/);
  assert.match(loader, /archivedAt: null/);
  assert.ok(!/searchParams|headers\(|cookies\(/.test(loader), "no request input decides which stores are listed");
  const select = loader.slice(loader.indexOf("select: {"), loader.indexOf("});", loader.indexOf("select: {")));
  for (const privateField of ["contactEmail", "contactPhone", "orders", "customers", "memberships", "paymentAccounts", "paymentMethods"]) {
    assert.ok(!select.includes(privateField), `${privateField} is never read`);
  }
  const browser = read("components/platform/site/work/WorkDemoBrowser.tsx");
  assert.match(browser, /role="tablist"/);
  assert.match(browser, /role="tab"/);
  assert.match(browser, /aria-selected/);
  assert.match(browser, /role="tabpanel"/);
  assert.match(browser, /View Live/);
  assert.match(browser, /opens in a new tab/);
});

// ---------- New store: template choice ----------

const storeBase = {
  name: "Template Choice",
  slug: "template-choice",
  businessType: "furniture",
  status: "DRAFT",
  ownerName: "Owner",
  ownerEmail: "owner@example.com",
  ownerPassword: "a long enough owner passphrase 2026",
  countryCode: "AE",
  baseCurrency: "AED",
  timezone: "Asia/Dubai",
  defaultLanguage: "en",
  languages: ["en"],
  accentColor: "#123456",
};
const reference = { countries: new Set(["AE"]), currencies: new Map([["AED", 2]]), languages: new Set(["en", "ar"]) };

test("a new store may start on any registered template; none chosen means the default; anything else is refused", () => {
  for (const key of TEMPLATE_KEYS) {
    const { values, errors } = validateStoreBase({ ...storeBase, templateKey: key }, reference);
    assert.equal(errors.templateKey, undefined, key);
    assert.equal(values.templateKey, key);
  }
  for (const missing of [undefined, ""]) {
    const { values, errors } = validateStoreBase({ ...storeBase, templateKey: missing }, reference);
    assert.equal(errors.templateKey, undefined);
    assert.equal(values.templateKey, DEFAULT_TEMPLATE_KEY);
  }
  for (const bad of ["nope", "Classic", 1, null, { key: "noor" }]) {
    assert.ok(validateStoreBase({ ...storeBase, templateKey: bad }, reference).errors.templateKey, JSON.stringify(bad));
  }
});

test("the create form lists every registered template from the registry, defaulting to the registry default", () => {
  const form = read("components/admin/StoreForm.tsx");
  assert.match(form, /TEMPLATE_KEYS\.map/);
  assert.match(form, /templateKey: DEFAULT_TEMPLATE_KEY/);
  assert.match(form, /name="templateKey"/);
  assert.ok(!/"(atelier|kinetic|maison|market|noor)"/.test(form), "no template is hard-coded in the form");
});

test("switching template asks for confirmation that names what is preserved", () => {
  const view = read("components/admin/StoreDesignView.tsx");
  assert.match(view, /<ConfirmDialog/);
  assert.match(view, /Current template:/);
  assert.ok(
    view.includes(
      "Changing the template changes the Store&apos;s presentation only. Your products, orders, customers, inventory, payments and\n          other Store data remain preserved.",
    ),
  );
});

// ---------- No live charges from any storefront ----------

test("online payment is only ever offered through a TEST-mode provider account", async () => {
  const neverCalled = {
    resolve: async () => {
      throw new Error("credentials must not be read for a LIVE account");
    },
  };
  const account = { id: "acct", storeId: "store", provider: "stripe", mode: "LIVE" as const, enabled: true, publicConfig: {}, secretRef: "ref" };
  assert.equal(
    await isOnlinePaymentMethodAvailable("stripe_checkout", account, { id: "store", countryCode: "AE", currency: "AED" }, neverCalled as never),
    false,
  );
  const orders = read("lib/server/orders.ts");
  assert.match(orders, /mode: "TEST"/, "order placement also refuses any provider account that is not TEST");
});
