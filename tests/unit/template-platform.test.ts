// Phase 3: new-store template choice, the public Work page's categories
// (read from Services, filtered by live demo stores) and the guarantee that
// no storefront — demo or client — can take a live payment.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { validateStoreBase } from "../../lib/admin/validation";
import { SERVICE_CATEGORIES } from "../../lib/platform/services";
import { STORE_DEMO_SERVICE_SLUG, storeIndustryLabel, workCategories, type WorkDemo } from "../../lib/platform/work";
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

// ---------- Work: the Services categories that have a live demo ----------

const demo = (name: string): WorkDemo => ({
  name,
  industry: "Furniture",
  templateKey: "classic",
  templateName: "Classic",
  tagline: null,
  headline: "A headline.",
  signatures: ["One", "Two"],
  url: `https://${name.toLowerCase()}.example/`,
  screenshots: null,
});

test("Work's categories ARE the Services categories, in Services order, shown only when they have a demo", () => {
  const all = Object.fromEntries(SERVICE_CATEGORIES.map((category) => [category.slug, [demo(category.slug)]]));
  assert.deepEqual(
    workCategories(all).map((category) => [category.slug, category.title]),
    SERVICE_CATEGORIES.map((category) => [category.slug, category.title]),
    "every Services category, same names and order, once each has a demo",
  );
  assert.deepEqual(workCategories({}), [], "no demos: no categories and no empty states");
  // Only store demos exist today: Ecommerce shows, Mobile apps (and every other category) is hidden from Work.
  const today = workCategories({ [STORE_DEMO_SERVICE_SLUG]: [demo("Oak"), demo("Linen")] });
  assert.deepEqual(today.map((category) => category.title), ["Ecommerce"]);
  assert.deepEqual(today[0].demos.map((d) => d.name), ["Oak", "Linen"], "a category lists ALL its demos");
  assert.ok(!today.some((category) => category.slug === "apps"), "no Mobile apps demo, no Mobile apps category in Work");
  assert.deepEqual(workCategories({ apps: [demo("Mobile")] }).map((c) => c.title), ["Mobile apps"], "a category appears as soon as it has a demo");
  assert.deepEqual(workCategories({ ecommerce: [] }), [], "an empty list is no demo");
  assert.deepEqual(workCategories({ "not-a-service": [demo("X")] }), [], "Work never invents a category Services doesn't list");
  assert.deepEqual(workCategories({ toString: [demo("X")] } as never), [], "no prototype keys");
  assert.equal(STORE_DEMO_SERVICE_SLUG, "ecommerce");
  assert.ok(SERVICE_CATEGORIES.some((category) => category.slug === STORE_DEMO_SERVICE_SLUG));
});

test("a demo store's industry label comes from its admin store type", () => {
  assert.equal(storeIndustryLabel("furniture"), "Furniture");
  assert.equal(storeIndustryLabel("grocery"), "Grocery");
  assert.equal(storeIndustryLabel("other"), null);
  assert.equal(storeIndustryLabel(null), null);
  assert.equal(storeIndustryLabel("made-up"), null);
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
  for (const pattern of [/role="tablist"/, /role="tab"/, /aria-selected/, /role="tabpanel"/, /aria-expanded/, /Ask for a walkthrough/, /opens in a new tab/]) {
    assert.match(browser, pattern);
  }
  assert.match(browser, /href=\{demo\.url\}/, "Ask for a walkthrough opens the live demo store itself");
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
