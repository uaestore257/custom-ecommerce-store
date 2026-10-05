import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import {
  buildDemoStoreLinks,
  isShowcasedTemplate,
  numberWord,
  platformFacts,
  SHOWCASE_ORDER,
  studioCssVariables,
  TEMPLATE_EDITORIAL,
} from "../../lib/platform/showcase";
import { getTemplateDefinition, TEMPLATE_KEYS } from "../../lib/templates/registry";
import { readableForeground, semanticCssVariables, themeCssVariables } from "../../lib/templates/theme";

test("every registered template has portfolio copy, showcased or not", () => {
  for (const key of TEMPLATE_KEYS) {
    const editorial = TEMPLATE_EDITORIAL[key];
    assert.ok(editorial.personality && editorial.idealFor, key);
    assert.ok(editorial.signatures.length >= 2, key);
  }
});

test("facts stated on the public site are derived from the registry", () => {
  const facts = platformFacts();
  assert.equal(facts.templates, TEMPLATE_KEYS.length);
  const palettes = TEMPLATE_KEYS.reduce((n, key) => n + Object.keys(getTemplateDefinition(key).theme.palettes).length, 0);
  assert.equal(facts.palettes, palettes);
  assert.equal(facts.allRtlReady, TEMPLATE_KEYS.every((key) => getTemplateDefinition(key).manifest.capabilities.rtlReady));
  assert.equal(numberWord(2), "Two");
  assert.equal(numberWord(42), "42");
});

test("demo links stay on the demo store's own host and only deep-link where the store is host-selected", () => {
  const links = buildDemoStoreLinks("Nest & Oak", "https://nest-and-oak.shops.test/", "/products/oak-sofa");
  assert.deepEqual(links, {
    storeName: "Nest & Oak",
    home: "https://nest-and-oak.shops.test/",
    listing: "https://nest-and-oak.shops.test/shop",
    product: "https://nest-and-oak.shops.test/products/oak-sofa",
    cart: "https://nest-and-oak.shops.test/cart",
  });

  // Temporary path-preview mode: the store is chosen by visiting /preview/<slug> first.
  assert.deepEqual(buildDemoStoreLinks("Demo", "https://preview.shops.test/preview/demo", "/products/x"), {
    storeName: "Demo",
    home: "https://preview.shops.test/preview/demo",
    listing: null,
    product: null,
    cart: null,
  });

  // Anything that is not a product path, or a protocol-relative path, never becomes a link.
  assert.equal(buildDemoStoreLinks("Demo", "https://demo.shops.test/", "//evil.test/x")?.product, null);
  assert.equal(buildDemoStoreLinks("Demo", "https://demo.shops.test/", null)?.product, null);
  assert.equal(buildDemoStoreLinks("Demo", null, "/products/x"), null);
  assert.equal(buildDemoStoreLinks("Demo", "not a url", "/products/x"), null);
  assert.equal(buildDemoStoreLinks("Demo", "javascript:alert(1)", null), null);
});

test("the studio site paints through the same semantic roles as storefronts, with readable accents", () => {
  const storefrontRoles = Object.keys(
    themeCssVariables(getTemplateDefinition("classic"), { palette: "light" }, "#0f766e"),
  ).sort();
  for (const tone of ["night", "ink", "paper"] as const) {
    const vars = studioCssVariables(tone);
    assert.deepEqual(Object.keys(vars).sort(), storefrontRoles, tone);
    assert.equal(vars["--sf-accent-foreground"], readableForeground(vars["--sf-accent"]), tone);
  }
});

test("themeCssVariables is unchanged by the semanticCssVariables extraction", () => {
  for (const key of TEMPLATE_KEYS) {
    const definition = getTemplateDefinition(key);
    for (const [palette, entry] of Object.entries(definition.theme.palettes)) {
      assert.deepEqual(
        themeCssVariables(definition, { palette }, "#123456"),
        semanticCssVariables(entry.tokens, "#123456", definition.theme.radius, definition.theme.controls),
        `${key}/${palette}`,
      );
    }
  }
});

test("showcased templates are registered, listed once, with case copy and screenshots", () => {
  assert.deepEqual([...SHOWCASE_ORDER].sort(), ["atelier", "classic", "kinetic", "maison", "market", "noor"]);
  assert.ok(SHOWCASE_ORDER.length > 0);
  assert.equal(new Set(SHOWCASE_ORDER).size, SHOWCASE_ORDER.length);
  for (const key of SHOWCASE_ORDER) {
    assert.ok((TEMPLATE_KEYS as readonly string[]).includes(key), key);
    assert.ok(isShowcasedTemplate(key), key);
    assert.ok(TEMPLATE_EDITORIAL[key].industry && TEMPLATE_EDITORIAL[key].headline, key);
    // SHOWCASE_MEDIA (next/image static imports) is type-checked against
    // SHOWCASE_ORDER; here we check the files it imports exist.
    for (const kind of ["desktop", "tall", "mobile"]) {
      assert.ok(existsSync(new URL(`../../public/showcase/${key}-${kind}.jpg`, import.meta.url)), `${key}-${kind}.jpg`);
    }
  }
});

test("a registered template that is not showcased is simply not presented as work", () => {
  const notShowcased = TEMPLATE_KEYS.filter((key) => !isShowcasedTemplate(key));
  for (const key of notShowcased) assert.ok(!(SHOWCASE_ORDER as readonly string[]).includes(key));
  assert.equal(SHOWCASE_ORDER.length + notShowcased.length, TEMPLATE_KEYS.length);
});
