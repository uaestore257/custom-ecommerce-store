import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_TEMPLATE_KEY,
  getTemplateDefinition,
  isTemplateKey,
  listTemplateManifests,
  resolveTemplateKey,
  TEMPLATE_KEYS,
} from "../../lib/templates/registry";
import {
  defaultThemeSelection,
  normalizeThemeConfig,
  readableForeground,
  resolveAccentColor,
  themeCssVariables,
  validateThemeConfigInput,
} from "../../lib/templates/theme";

const TOKEN_KEYS = [
  "background", "foreground", "muted", "mutedForeground", "border", "surface",
  "surfaceElevated", "destructive", "success", "warning", "focus",
];
const CSS_COLOR = /^#[0-9a-f]{6}$/i;

test("every registered template resolves to a complete, self-consistent definition", () => {
  assert.ok(TEMPLATE_KEYS.length >= 2);
  assert.deepEqual(listTemplateManifests().map((m) => m.key), [...TEMPLATE_KEYS]);
  for (const key of TEMPLATE_KEYS) {
    const { manifest, theme } = getTemplateDefinition(key);
    assert.equal(manifest.key, key, "manifest key matches its registry key");
    assert.match(manifest.version, /^\d+\.\d+\.\d+$/, `${key}: semantic version`);
    assert.ok(manifest.name && manifest.description && manifest.homepageSections.length > 0, key);
    assert.ok(manifest.capabilities.rtlReady, `${key}: templates must be RTL-ready`);
    assert.ok(theme.options.palette, `${key}: has a palette option`);
    assert.deepEqual(
      theme.options.palette.choices.map((c) => c.value).sort(),
      Object.keys(theme.palettes).sort(),
      `${key}: palette choices and palettes match`,
    );
    for (const [option, spec] of Object.entries(theme.options)) {
      assert.ok(spec.choices.some((c) => c.value === spec.default), `${key}.${option}: default is a valid choice`);
      assert.equal(new Set(spec.choices.map((c) => c.value)).size, spec.choices.length, `${key}.${option}: unique choices`);
    }
    for (const [name, palette] of Object.entries(theme.palettes)) {
      assert.deepEqual(Object.keys(palette.tokens).sort(), [...TOKEN_KEYS].sort(), `${key}.${name}: all semantic tokens`);
      for (const value of Object.values(palette.tokens)) assert.match(value, CSS_COLOR, `${key}.${name}`);
    }
    assert.match(theme.fallbackAccent, CSS_COLOR);
  }
});

test("a valid key resolves; unknown or malformed keys fall back to the deterministic default", () => {
  assert.equal(DEFAULT_TEMPLATE_KEY, "classic", "matches the Store.templateKey column default");
  assert.equal(resolveTemplateKey("atelier"), "atelier");
  assert.equal(resolveTemplateKey("classic"), "classic");
  for (const bad of ["", "ATELIER", "atelier ", "../atelier", "constructor", "__proto__", "toString", null, undefined, 1, {}, ["atelier"]]) {
    assert.equal(isTemplateKey(bad), false, String(bad));
    assert.equal(resolveTemplateKey(bad), DEFAULT_TEMPLATE_KEY, String(bad));
  }
});

test("stored theme config is normalized: unknown keys dropped, invalid values defaulted, never throws", () => {
  const atelier = getTemplateDefinition("atelier");
  assert.deepEqual(normalizeThemeConfig(atelier, { palette: "charcoal", hero: "full-bleed" }), { palette: "charcoal", hero: "full-bleed" });
  assert.deepEqual(normalizeThemeConfig(atelier, {}), defaultThemeSelection(atelier));
  for (const raw of [null, undefined, "linen", 42, [], ["charcoal"], { palette: "neon" }, { palette: { value: "charcoal" } }]) {
    assert.deepEqual(normalizeThemeConfig(atelier, raw), defaultThemeSelection(atelier), JSON.stringify(raw));
  }
  // Shaped like a JSONB value read back from the database.
  const normalized = normalizeThemeConfig(atelier, JSON.parse(JSON.stringify({
    palette: "stone",
    script: "<script>alert(1)</script>",
    component: "../../evil",
    style: "background:url(javascript:alert(1))",
  }).replace("{", '{"__proto__":{"polluted":true},')));
  assert.deepEqual(Object.keys(normalized).sort(), ["hero", "palette"]);
  assert.equal(normalized.palette, "stone");
  assert.equal(({} as Record<string, unknown>).polluted, undefined, "no prototype pollution");
  // An object with a non-standard prototype is not plain data: all defaults.
  assert.deepEqual(normalizeThemeConfig(atelier, Object.create({ palette: "stone" })), defaultThemeSelection(atelier));
  // A key of another template's options is not honoured.
  assert.deepEqual(normalizeThemeConfig(getTemplateDefinition("classic"), { hero: "full-bleed", palette: "charcoal" }), { palette: "light" });
});

test("admin theme input is validated strictly", () => {
  const atelier = getTemplateDefinition("atelier");
  assert.deepEqual(validateThemeConfigInput(atelier, { palette: "stone" }), { ok: true, value: { palette: "stone", hero: "split" } });
  assert.deepEqual(validateThemeConfigInput(atelier, undefined), { ok: true, value: defaultThemeSelection(atelier) });
  for (const bad of [
    "linen",
    [],
    { palette: "neon" },
    { palette: "linen", css: "color:red" },
    { hero: 1 },
  ]) {
    const result = validateThemeConfigInput(atelier, bad);
    assert.equal(result.ok, false, JSON.stringify(bad));
  }
});

test("CSS variables come only from template constants and a validated accent", () => {
  const atelier = getTemplateDefinition("atelier");
  const vars = themeCssVariables(atelier, normalizeThemeConfig(atelier, { palette: "charcoal" }), "#C2410C");
  assert.equal(vars["--sf-background"], atelier.theme.palettes.charcoal.tokens.background);
  assert.equal(vars["--sf-accent"], "#c2410c");
  for (const [name, value] of Object.entries(vars)) {
    assert.match(name, /^--[a-z-]+$/);
    assert.doesNotMatch(value, /[;{}<>"'()]|url|expression|javascript/i, `${name}: ${value}`);
  }
  for (const bad of ["red", "#fff", "#12345g", "#123456; background:url(x)", "javascript:alert(1)", null, 7]) {
    assert.equal(resolveAccentColor(atelier, bad), atelier.theme.fallbackAccent, String(bad));
    assert.equal(themeCssVariables(atelier, defaultThemeSelection(atelier), bad)["--sf-accent"], atelier.theme.fallbackAccent);
  }
});

test("accent foreground picks the more readable of white and near-black", () => {
  assert.equal(readableForeground("#0f766e"), "#ffffff");
  assert.equal(readableForeground("#000000"), "#ffffff");
  assert.equal(readableForeground("#ffffff"), "#111111");
  assert.equal(readableForeground("#f5d76e"), "#111111");
});
