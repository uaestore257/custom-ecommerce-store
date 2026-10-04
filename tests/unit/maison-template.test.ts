import assert from "node:assert/strict";
import { test } from "node:test";
import { isShowcasedTemplate, SHOWCASE_ORDER, TEMPLATE_EDITORIAL } from "../../lib/platform/showcase";
import { getTemplateDefinition, isTemplateKey, resolveTemplateKey } from "../../lib/templates/registry";
import { normalizeThemeConfig, resolveControlTokens, themeCssVariables, validateThemeConfigInput } from "../../lib/templates/theme";

const maison = getTemplateDefinition("maison");

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

test("maison is registered with editorial copy but not showcased (no demo store or screenshots yet)", () => {
  assert.ok(isTemplateKey("maison"));
  assert.equal(resolveTemplateKey("maison"), "maison");
  assert.equal(maison.manifest.key, "maison");
  assert.equal(isShowcasedTemplate("maison"), false);
  assert.ok(!(SHOWCASE_ORDER as readonly string[]).includes("maison"));
  assert.ok(TEMPLATE_EDITORIAL.maison.signatures.length >= 2);
});

test("maison declares its design vocabulary, 2:3 cards and Arabic-capable typography", () => {
  const { design, capabilities } = maison.manifest;
  assert.equal(design.navigation, "overlay-menu");
  assert.equal(design.cartPresentation, "drawer-and-page");
  assert.equal(design.motion, "subtle");
  assert.equal(design.cardImageRatio, "2:3");
  assert.deepEqual(design.typography, {
    heading: "Bodoni Moda",
    body: "Inter Tight",
    arabic: { heading: "El Messiri", body: "Almarai" },
  });
  assert.ok(capabilities.cartDrawer && capabilities.productGallery && capabilities.rtlReady);
  assert.equal(capabilities.quickAddOnCards, false, "the product page sells");
  assert.deepEqual(maison.theme.radius, { control: "0px", card: "0px" });
});

test("maison's control tokens give shared pages tracked capitals and underlined fields", () => {
  const controls = resolveControlTokens(maison.theme.controls);
  assert.equal(controls.textTransform, "uppercase");
  assert.equal(controls.letterSpacing, "0.16em");
  assert.equal(controls.fontWeight, "500");
  assert.equal(controls.inputStyle, "underline");
  assert.equal(controls.borderWidth, "1px");
  const vars = themeCssVariables(maison, normalizeThemeConfig(maison, {}), "#8a6a3f");
  assert.equal(vars["--sf-input-border-width"], "0 0 1px");
  assert.equal(vars["--sf-input-background"], "transparent");
  assert.equal(vars["--sf-control-text-transform"], "uppercase");
});

test("maison palettes are readable: ink/ivory text 12:1 or better, secondary text at least 4.5:1", () => {
  for (const [name, { tokens }] of Object.entries(maison.theme.palettes)) {
    assert.ok(contrast(tokens.foreground, tokens.background) >= 12, `${name}: foreground`);
    assert.ok(contrast(tokens.mutedForeground, tokens.background) >= 4.5, `${name}: muted text`);
    assert.ok(contrast(tokens.mutedForeground, tokens.surface) >= 4.5, `${name}: muted text on surface`);
    assert.ok(contrast(tokens.mutedForeground, tokens.surfaceElevated) >= 4.5, `${name}: muted text in the drawer`);
  }
  // The campaign field is a fixed ink with ivory type, whatever the palette.
  assert.ok(contrast("#f4efe6", "#0c0b0a") >= 12);
});

test("the hero option only accepts campaign or wordmark", () => {
  assert.equal(normalizeThemeConfig(maison, {}).hero, "campaign");
  assert.equal(normalizeThemeConfig(maison, { hero: "wordmark" }).hero, "wordmark");
  assert.equal(normalizeThemeConfig(maison, { hero: "split" }).hero, "campaign", "Atelier's hero values do not carry over");
  assert.equal(validateThemeConfigInput(maison, { palette: "noir", hero: "wordmark" }).ok, true);
  assert.equal(validateThemeConfigInput(maison, { accentSurface: "solid" }).ok, false, "Kinetic's options do not carry over");
});
