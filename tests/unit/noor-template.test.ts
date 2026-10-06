import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { isShowcasedTemplate, SHOWCASE_ORDER, TEMPLATE_EDITORIAL } from "../../lib/platform/showcase";
import { messagesFor, storefrontUiLocale } from "../../lib/storefront-i18n";
import { normalizeShelvesRequest } from "../../lib/storefront-shelves";
import { getTemplateDefinition, isTemplateKey } from "../../lib/templates/registry";
import { readableForeground, resolveControlTokens, themeCssVariables, normalizeThemeConfig } from "../../lib/templates/theme";
import { NOOR_MESSAGES, noorMessages } from "../../templates/noor/messages";

const noor = getTemplateDefinition("noor");

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

test("noor is registered with editorial copy and is showcased", () => {
  assert.ok(isTemplateKey("noor"));
  assert.equal(noor.manifest.key, "noor");
  assert.equal(isShowcasedTemplate("noor"), true);
  assert.ok((SHOWCASE_ORDER as readonly string[]).includes("noor"));
  assert.ok(TEMPLATE_EDITORIAL.noor.signatures.length >= 2);
});

test("noor declares its own design vocabulary and Arabic-first typography", () => {
  const { design, capabilities } = noor.manifest;
  assert.equal(design.navigation, "centered-stack");
  assert.equal(design.cartPresentation, "page");
  assert.equal(design.motion, "subtle");
  assert.equal(design.cardImageRatio, "3:4");
  assert.deepEqual(design.typography, { heading: "Marcellus", body: "IBM Plex Sans", arabic: { heading: "Reem Kufi", body: "IBM Plex Sans Arabic" } });
  assert.equal(capabilities.cartDrawer, false, "cart page only");
  assert.ok(capabilities.rtlReady);
  assert.deepEqual([...capabilities.uiLocales], ["en", "ar"], "the first template with an Arabic interface");
});

test("noor's interface follows the store's language: Arabic for an Arabic store, English otherwise", () => {
  assert.equal(storefrontUiLocale({ language: "ar", templateKey: "noor" }), "ar");
  assert.equal(storefrontUiLocale({ language: "ar-SA", templateKey: "noor" }), "ar");
  assert.equal(storefrontUiLocale({ language: "en", templateKey: "noor" }), "en");
  assert.equal(storefrontUiLocale({ language: "fr", templateKey: "noor" }), "en", "no French dictionary yet");
  // Other templates are untouched by Noor's Arabic: still English for an Arabic store.
  for (const key of ["classic", "atelier", "kinetic", "maison", "market"] as const) {
    assert.equal(storefrontUiLocale({ language: "ar", templateKey: key }), "en", key);
  }
});

test("noor's own copy is complete in both languages, and the Arabic is Arabic", () => {
  const keys = Object.keys(NOOR_MESSAGES.en).sort();
  assert.deepEqual(Object.keys(NOOR_MESSAGES.ar).sort(), keys);
  const ar = noorMessages("ar");
  for (const value of [ar.shopTheCollection, ar.featured, ar.yourCart, ar.checkout, ar.soldOut, ar.policies.privacy, ar.onlyLeft(2), ar.aboutStore("X")]) {
    assert.match(value, /[؀-ۿ]/, value);
  }
  assert.equal(noorMessages("en").cartLabel(messagesFor("en").items(2)), "Cart, 2 items");
  assert.equal(noorMessages("ar").cartLabel(messagesFor("ar").items(2)), "السلة، منتجان");
});

test("noor's copy makes no claims about a store: no invented history, origins or product facts", () => {
  const all = JSON.stringify(Object.values(NOOR_MESSAGES).map((m) => Object.values(m).map((v) => (typeof v === "function" ? v.toString() : v))));
  for (const word of ["since", "founded", "years", "authentic", "certified", "origin", "notes", "ingredients"]) {
    assert.doesNotMatch(all.toLowerCase(), new RegExp(`\\b${word}\\b`), word);
  }
  // ("الأصلي" alone is fine: it is "original price".)
  for (const phrase of ["منذ", "تأسس", "منتج أصلي", "أصلي ١٠٠", "أصلي 100"]) assert.ok(!all.includes(phrase), phrase);
});

test("noor opts into P5 shelves with a declaration the shared core accepts unchanged", () => {
  const source = readFileSync(new URL("../../templates/noor/index.ts", import.meta.url), "utf8");
  const match = source.match(/homepageShelves:\s*\{\s*categories:\s*(\d+),\s*perCategory:\s*(\d+)\s*\}/);
  assert.ok(match);
  const declared = { categories: Number(match[1]), perCategory: Number(match[2]) };
  assert.deepEqual(normalizeShelvesRequest(declared), declared);
});

test("noor's palettes are readable and its controls are arched pills that keep textareas soft", () => {
  for (const [name, { tokens }] of Object.entries(noor.theme.palettes)) {
    assert.ok(contrast(tokens.foreground, tokens.background) >= 12, `${name}: foreground`);
    assert.ok(contrast(tokens.mutedForeground, tokens.background) >= 4.5, `${name}: muted text`);
    assert.ok(contrast(tokens.mutedForeground, tokens.surface) >= 4.5, `${name}: muted text on surface`);
    assert.ok(contrast(tokens.destructive, tokens.background) >= 4.5, `${name}: sold-out note`);
  }
  assert.ok(contrast(readableForeground(noor.theme.fallbackAccent), noor.theme.fallbackAccent) >= 4.5);
  assert.equal(noor.theme.radius.control, "1.5rem");
  const controls = resolveControlTokens(noor.theme.controls);
  assert.equal(controls.inputStyle, "boxed");
  assert.equal(controls.textTransform, "none", "no forced capitals: Arabic has no case");
  const vars = themeCssVariables(noor, normalizeThemeConfig(noor, {}), "#86552e");
  assert.equal(vars["--sf-input-radius"], "1.5rem");
});
