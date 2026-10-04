import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { isShowcasedTemplate, SHOWCASE_ORDER, TEMPLATE_EDITORIAL } from "../../lib/platform/showcase";
import { normalizeShelvesRequest } from "../../lib/storefront-shelves";
import { getTemplateDefinition, isTemplateKey, resolveTemplateKey } from "../../lib/templates/registry";
import { normalizeThemeConfig, readableForeground, resolveControlTokens, validateThemeConfigInput } from "../../lib/templates/theme";

const market = getTemplateDefinition("market");

function luminance(hex: string) {
  const channel = (offset: number) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}
function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

test("market is registered with editorial copy but not showcased (no demo store or screenshots yet)", () => {
  assert.ok(isTemplateKey("market"));
  assert.equal(resolveTemplateKey("market"), "market");
  assert.equal(isShowcasedTemplate("market"), false);
  assert.ok(!(SHOWCASE_ORDER as readonly string[]).includes("market"));
  assert.ok(TEMPLATE_EDITORIAL.market.signatures.length >= 2);
});

test("market declares the search-first vocabulary, compact density and Arabic-capable typography", () => {
  const { design, capabilities, homepageSections } = market.manifest;
  assert.equal(design.navigation, "search-first-tabbar");
  assert.equal(design.cartPresentation, "page");
  assert.equal(design.motion, "subtle");
  assert.equal(design.density, "compact");
  assert.equal(design.cardImageRatio, "1:1");
  assert.deepEqual(design.typography, { heading: "Figtree", body: "Figtree", arabic: { heading: "IBM Plex Sans Arabic", body: "IBM Plex Sans Arabic" } });
  assert.ok(capabilities.quickAddOnCards && capabilities.rtlReady);
  assert.ok(homepageSections.includes("category-shelves"));
  assert.ok(!homepageSections.some((section) => section.includes("hero")), "no marketing hero");
});

test("market opts into P5 shelves with a declaration the shared core accepts unchanged", () => {
  // templates/market/index.ts is the component half (client components),
  // so its declaration is read from source here.
  const source = readFileSync(new URL("../../templates/market/index.ts", import.meta.url), "utf8");
  const match = source.match(/homepageShelves:\s*\{\s*categories:\s*(\d+),\s*perCategory:\s*(\d+)\s*\}/);
  assert.ok(match, "market declares homepageShelves");
  const declared = { categories: Number(match[1]), perCategory: Number(match[2]) };
  assert.deepEqual(normalizeShelvesRequest(declared), declared, "within the hard ceilings, so nothing is clamped");
});

test("market's palettes are readable and its accent fallback carries readable button text", () => {
  for (const [name, { tokens }] of Object.entries(market.theme.palettes)) {
    assert.ok(contrast(tokens.foreground, tokens.background) >= 12, `${name}: foreground`);
    assert.ok(contrast(tokens.foreground, tokens.surface) >= 12, `${name}: foreground on cards`);
    assert.ok(contrast(tokens.mutedForeground, tokens.background) >= 4.5, `${name}: muted text`);
    assert.ok(contrast(tokens.mutedForeground, tokens.surface) >= 4.5, `${name}: muted text on cards`);
    assert.ok(contrast(tokens.warning, tokens.surface) >= 4.5, `${name}: low-stock note on cards`);
    assert.ok(contrast(tokens.destructive, tokens.surface) >= 4.5, `${name}: sale price on cards`);
  }
  const accent = market.theme.fallbackAccent;
  assert.ok(contrast(readableForeground(accent), accent) >= 4.5);
});

test("market's controls and options are safe", () => {
  const controls = resolveControlTokens(market.theme.controls);
  assert.equal(controls.fontWeight, "700");
  assert.equal(controls.inputStyle, "boxed");
  assert.deepEqual(controls.height, { sm: "2.25rem", md: "3rem", lg: "3.25rem" });
  assert.equal(normalizeThemeConfig(market, {}).palette, "fresh");
  assert.equal(validateThemeConfigInput(market, { palette: "clinic" }).ok, true);
  assert.equal(validateThemeConfigInput(market, { hero: "campaign" }).ok, false, "other templates' options do not carry over");
});
