// Phase 3: new-store template choice, the public Work page's categories
// (read from Services, filtered by live demo stores) and the guarantee that
// no storefront — demo or client — can take a live payment.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { validateStoreBase } from "../../lib/admin/validation";
import { SERVICE_CATEGORIES } from "../../lib/platform/services";
import { resolveWorkServiceSlug, storeIndustryLabel, workCategories, type WorkDemo } from "../../lib/platform/work";
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

const demo = (name: string, serviceSlug = "ecommerce", workOrder: number | null = null): WorkDemo => ({
  name,
  industry: "Furniture",
  serviceSlug,
  workOrder,
  templateKey: "classic",
  templateName: "Classic",
  tagline: null,
  headline: "A headline.",
  signatures: ["One", "Two"],
  url: `https://${name.toLowerCase()}.example/`,
  screenshots: null,
});

test("Work demos sort by explicit display order, with ties and blank values stable", () => {
  const category = workCategories({
    ecommerce: [demo("Unnumbered"), demo("Second", "ecommerce", 2), demo("First", "ecommerce", 1), demo("First tie", "ecommerce", 1)],
  })[0];
  assert.deepEqual(category.demos.map((item) => item.name), ["First", "First tie", "Second", "Unnumbered"]);
});

test("Work's categories ARE the Services categories, in Services order, shown only when they have a demo", () => {
  const all = Object.fromEntries(SERVICE_CATEGORIES.map((category) => [category.slug, [demo(category.slug)]]));
  assert.deepEqual(
    workCategories(all).map((category) => [category.slug, category.title]),
    SERVICE_CATEGORIES.map((category) => [category.slug, category.title]),
    "every Services category, same names and order, once each has a demo",
  );
  assert.deepEqual(workCategories({}), [], "no demos: no categories and no empty states");
  const today = workCategories({ ecommerce: [demo("Oak"), demo("Linen")] });
  assert.deepEqual(today.map((category) => category.title), ["Ecommerce"]);
  assert.deepEqual(today[0].demos.map((d) => d.name), ["Oak", "Linen"], "a category lists ALL its demos");
  assert.ok(!today.some((category) => category.slug === "apps"), "no Mobile apps demo, no Mobile apps category in Work");
  assert.deepEqual(workCategories({ apps: [demo("Mobile")] }).map((c) => c.title), ["Mobile apps"], "a category appears as soon as it has a demo");
  assert.deepEqual(workCategories({ ecommerce: [] }), [], "an empty list is no demo");
  assert.deepEqual(workCategories({ "not-a-service": [demo("X")] }), [], "Work never invents a category Services doesn't list");
  assert.deepEqual(workCategories({ toString: [demo("X")] } as never), [], "no prototype keys");
});

test("a demo store's industry label comes from its admin store type", () => {
  assert.equal(storeIndustryLabel("furniture"), "Furniture");
  assert.equal(storeIndustryLabel("grocery"), "Grocery");
  assert.equal(storeIndustryLabel("other"), null);
  assert.equal(storeIndustryLabel(null), null);
  assert.equal(storeIndustryLabel("made-up"), null);
});

test("Work categories require an explicit canonical Services assignment, never an industry guess", () => {
  for (const category of SERVICE_CATEGORIES) {
    assert.equal(resolveWorkServiceSlug(category.slug), category.slug);
  }
  for (const businessType of ["furniture", "fashion", "electronics", "beauty", "grocery", "other", null]) {
    assert.equal(resolveWorkServiceSlug(businessType), null, `${businessType} is not a Services category assignment`);
  }
  assert.equal(resolveWorkServiceSlug("not-a-service"), null);
  assert.equal(resolveWorkServiceSlug(null), null);
});

test("Work groups demos by their actual service category and omits empty categories", () => {
  const categories = workCategories({
    ecommerce: [demo("Oak"), demo("Linen")],
    websites: [demo("North", "websites")],
    ai: [demo("Alpha", "ai")],
    software: [demo("Studio", "software")],
  });
  assert.deepEqual(categories.map((category) => category.slug), ["ecommerce", "websites", "ai", "software"]);
  assert.deepEqual(categories.map((category) => category.demos.length), [2, 1, 1, 1]);
  assert.deepEqual(workCategories({ ecommerce: [] }), [], "empty categories vanish");
  assert.deepEqual(workCategories({ apps: [demo("Mobile", "apps")] }).map((category) => category.slug), ["apps"], "a valid category appears on its own");
  assert.ok(!workCategories({ ecommerce: [demo("Oak")], websites: [] }).some((category) => category.slug === "websites"), "no empty category is shown");
});

test("the Work page reads demos through the server allow-list, never a store id from the request", () => {
  const loader = read("lib/server/platform/work.ts");
  assert.match(loader, /isDemo: true/);
  assert.match(loader, /status: "ACTIVE"/);
  assert.match(loader, /archivedAt: null/);
  assert.match(loader, /workServiceSlug: true/);
  assert.match(loader, /workOrder: true/);
  assert.match(loader, /resolveWorkServiceSlug\(store\.workServiceSlug\)/);
  assert.doesNotMatch(loader, /resolveWorkServiceSlug\(store\.businessType/);
  assert.ok(!/searchParams|headers\(|cookies\(/.test(loader), "no request input decides which stores are listed");
  const select = loader.slice(loader.indexOf("select: {"), loader.indexOf("});", loader.indexOf("select: {")));
  for (const privateField of ["contactEmail", "contactPhone", "orders", "customers", "memberships", "paymentAccounts", "paymentMethods"]) {
    assert.ok(!select.includes(privateField), `${privateField} is never read`);
  }
  const homepage = read("components/platform/site/pages/HomePage.tsx");
  assert.match(homepage, /getTemplateShowcase/, "the homepage loads demo stores for the Hero");
  assert.match(homepage, /<Hero tagline=\{agency\.tagline\} lead=\{lead\} second=\{second\}/, "the homepage Hero receives real demo-store entries");
  assert.doesNotMatch(homepage, /WorkCase|NextStoreCard|Live stores, not mock-ups/, "the homepage does not render the former full-page demo-store gallery");
  const hero = read("components/platform/site/home/Hero.tsx");
  for (const pattern of [/SHOWCASE_MEDIA/, /TemplateShowcaseEntry/, /BrowserShot/, /PhoneShot/, /Live demo stores/]) {
    assert.match(hero, pattern, "the homepage Hero displays the real desktop and mobile demo-store captures");
  }

  const browser = read("components/platform/site/work/WorkDemoBrowser.tsx");
  assert.match(browser, /useState\(categories\[0\]\?\.slug\)/, "initial selection is the first available Services category");
  assert.match(browser, /current\.demos\.map/, "only demos from the selected category are rendered");
  for (const pattern of [/role="tablist"/, /role="tab"/, /aria-selected/, /role="tabpanel"/, /<DemoStoreShowcase/]) {
    assert.match(browser, pattern);
  }
  assert.doesNotMatch(browser, /function DemoCard|function DemoDetails/, "Work does not render its former generic cards or separate details panel");
  const presentation = read("components/platform/site/work/DemoStoreShowcase.tsx");
  for (const pattern of [/BrowserShot/, /PhoneShot/, /SHOWCASE_MEDIA/, /data-tilt/, /ExternalButtonLink/, /demo\.url/]) {
    assert.match(presentation, pattern, "Work reuses the polished screenshot, motion and live-store presentation");
  }
});

test("platform Work-category controls use canonical Services categories and are platform-owner only", () => {
  const admin = read("components/admin/StoreDemoControls.tsx");
  const action = read("app/admin/actions.ts");
  const permissions = read("lib/server/admin/permissions.ts");
  assert.match(admin, /SERVICE_CATEGORIES\.map/);
  assert.match(admin, /setStoreWorkServiceCategoryAction/);
  assert.match(action, /asPlatformOwner\("setStoreWorkServiceCategory"/);
  assert.match(permissions, /setStoreWorkServiceCategoryAction: "platform-owner"/);
  assert.match(admin, /Work display order/);
  assert.match(admin, /setStoreWorkOrderAction/);
  assert.match(action, /asPlatformOwner\("setStoreWorkOrder"/);
  assert.match(permissions, /setStoreWorkOrderAction: "platform-owner"/);
  const overview = read("components/admin/StoreOverviewView.tsx");
  assert.match(overview, /<StoreDemoControls/);
  assert.match(overview, /layout="inline"/, "the platform control is adjacent to Preview storefront on Manage");
  const suspension = read("components/admin/StorePlatformControls.tsx");
  assert.match(suspension, /Suspend store/);
  assert.match(suspension, /Delete store/);
  assert.match(suspension, /archiveStoreAction/, "the Delete store option uses reversible archive behavior");
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
  assert.match(
    view,
    /Changing the template changes the Store&apos;s presentation only\. Your products, orders, customers, inventory, payments and\s+other Store data remain preserved\./,
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
