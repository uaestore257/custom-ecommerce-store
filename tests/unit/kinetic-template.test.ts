import assert from "node:assert/strict";
import { test } from "node:test";
import { isShowcasedTemplate, TEMPLATE_EDITORIAL } from "../../lib/platform/showcase";
import { getTemplateDefinition, isTemplateKey, resolveTemplateKey } from "../../lib/templates/registry";
import { normalizeThemeConfig, readableForeground, resolveControlTokens, themeCssVariables, validateThemeConfigInput } from "../../lib/templates/theme";

const kinetic = getTemplateDefinition("kinetic");

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

test("kinetic is registered and resolves, but is not showcased until it has a demo store and screenshots", () => {
  assert.ok(isTemplateKey("kinetic"));
  assert.equal(resolveTemplateKey("kinetic"), "kinetic");
  assert.equal(kinetic.manifest.key, "kinetic");
  assert.equal(isShowcasedTemplate("kinetic"), false);
  assert.ok(TEMPLATE_EDITORIAL.kinetic.signatures.length >= 2);
});

test("kinetic declares its Phase 3 design vocabulary and typography", () => {
  const { design, capabilities } = kinetic.manifest;
  assert.equal(design.navigation, "chip-rail");
  assert.equal(design.cartPresentation, "sheet-and-page");
  assert.equal(design.motion, "expressive");
  assert.equal(design.cardImageRatio, "1:1");
  assert.deepEqual(design.typography, { heading: "Bricolage Grotesque", body: "Readex Pro", arabic: { heading: "Readex Pro", body: "Readex Pro" } });
  assert.ok(capabilities.cartDrawer && capabilities.quickAddOnCards && capabilities.productGallery && capabilities.rtlReady);
});

test("kinetic's control tokens give shared pages heavy, 2px, taller controls", () => {
  const controls = resolveControlTokens(kinetic.theme.controls);
  assert.equal(controls.fontWeight, "700");
  assert.equal(controls.borderWidth, "2px");
  assert.deepEqual(controls.height, { sm: "2.5rem", md: "3rem", lg: "3.5rem" });
  assert.equal(controls.textTransform, "none");
  const vars = themeCssVariables(kinetic, normalizeThemeConfig(kinetic, {}), "#f25c27");
  assert.equal(vars["--sf-control-border-width"], "2px");
  assert.equal(vars["--sf-input-border-width"], "2px");
});

test("kinetic palettes are readable: text 7:1 or better, secondary text and edges at least 4.5:1", () => {
  for (const [name, { tokens }] of Object.entries(kinetic.theme.palettes)) {
    assert.ok(contrast(tokens.foreground, tokens.background) >= 7, `${name}: foreground`);
    assert.ok(contrast(tokens.foreground, tokens.surface) >= 7, `${name}: foreground on surface`);
    assert.ok(contrast(tokens.mutedForeground, tokens.background) >= 4.5, `${name}: muted text`);
    assert.ok(contrast(tokens.mutedForeground, tokens.surface) >= 4.5, `${name}: muted text on surface`);
  }
  // Text on a solid accent block uses the readable foreground for that accent.
  for (const accent of [kinetic.theme.fallbackAccent, "#0057ff", "#ffd400", "#111111", "#00a86b"]) {
    assert.ok(contrast(readableForeground(accent), accent) >= 4.5, accent);
  }
});

test("the accent-block option only accepts its two choices", () => {
  assert.equal(normalizeThemeConfig(kinetic, {}).accentSurface, "solid");
  assert.equal(normalizeThemeConfig(kinetic, { accentSurface: "tint" }).accentSurface, "tint");
  assert.equal(normalizeThemeConfig(kinetic, { accentSurface: "neon" }).accentSurface, "solid");
  assert.equal(validateThemeConfigInput(kinetic, { palette: "ink", accentSurface: "tint" }).ok, true);
  assert.equal(validateThemeConfigInput(kinetic, { accentSurface: "url(x)" }).ok, false);
  assert.equal(validateThemeConfigInput(kinetic, { hero: "split" }).ok, false, "Atelier's options do not carry over");
});
