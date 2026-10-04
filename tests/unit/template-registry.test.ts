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
  DEFAULT_CONTROL_TOKENS,
  defaultThemeSelection,
  normalizeThemeConfig,
  readableForeground,
  resolveAccentColor,
  resolveControlTokens,
  semanticCssVariables,
  themeCssVariables,
  validateThemeConfigInput,
} from "../../lib/templates/theme";
import {
  CART_PRESENTATIONS,
  cartDescription,
  cartLabel,
  MOTION_LEVELS,
  motionLabel,
  NAVIGATION_STYLES,
  navigationLabel,
} from "../../lib/templates/vocabulary";

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

test("manifests use only the shared design vocabulary, and every value has a label", () => {
  for (const key of TEMPLATE_KEYS) {
    const { design } = getTemplateDefinition(key).manifest;
    assert.ok(Object.hasOwn(NAVIGATION_STYLES, design.navigation), `${key}: navigation`);
    assert.ok(Object.hasOwn(CART_PRESENTATIONS, design.cartPresentation), `${key}: cart`);
    assert.ok(Object.hasOwn(MOTION_LEVELS, design.motion), `${key}: motion`);
    assert.ok(design.typography.arabic.heading && design.typography.arabic.body, `${key}: Arabic-capable faces`);
  }
  for (const style of Object.keys(NAVIGATION_STYLES) as (keyof typeof NAVIGATION_STYLES)[]) {
    assert.ok(navigationLabel(style) && navigationLabel(style) !== style, `${style}: has a human label`);
  }
  for (const presentation of Object.keys(CART_PRESENTATIONS) as (keyof typeof CART_PRESENTATIONS)[]) {
    assert.ok(cartLabel(presentation) && cartDescription(presentation), presentation);
  }
  for (const level of Object.keys(MOTION_LEVELS) as (keyof typeof MOTION_LEVELS)[]) assert.ok(motionLabel(level), level);
  // The vocabulary planned for Phase 3 exists alongside today's values.
  assert.deepEqual(Object.keys(NAVIGATION_STYLES), [
    "inline-bar", "editorial-split", "overlay-menu", "chip-rail", "search-first-tabbar", "centered-stack",
  ]);
  assert.deepEqual(Object.keys(CART_PRESENTATIONS), ["page", "drawer-and-page", "sheet-and-page"]);
  assert.deepEqual(Object.keys(MOTION_LEVELS), ["none", "subtle", "expressive"]);
  // Existing templates keep their labels on the public comparison table.
  assert.equal(navigationLabel("inline-bar"), "Inline bar");
  assert.equal(navigationLabel("editorial-split"), "Editorial split");
  assert.equal(cartLabel("page"), "Cart page");
  assert.equal(cartLabel("drawer-and-page"), "Drawer and cart page");
  assert.equal(cartDescription("page"), "Dedicated cart page");
  assert.equal(cartDescription("drawer-and-page"), "Cart drawer and cart page");
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

const CSS_LENGTH = /^(0|\d*\.?\d+(px|rem|em))$/;

test("control tokens: defaults reproduce the original shared look, and every template's values are safe constants", () => {
  assert.deepEqual(DEFAULT_CONTROL_TOKENS, {
    textTransform: "none",
    letterSpacing: "normal",
    fontWeight: "600",
    height: { sm: "2.25rem", md: "2.75rem", lg: "3rem" },
    borderWidth: "1px",
    inputStyle: "boxed",
  });
  for (const key of TEMPLATE_KEYS) {
    const { theme } = getTemplateDefinition(key);
    const controls = resolveControlTokens(theme.controls);
    assert.ok(["none", "uppercase"].includes(controls.textTransform), key);
    assert.ok(controls.letterSpacing === "normal" || CSS_LENGTH.test(controls.letterSpacing), key);
    assert.ok(["400", "500", "600", "700"].includes(controls.fontWeight), key);
    for (const height of Object.values(controls.height)) assert.match(height, CSS_LENGTH, key);
    assert.match(controls.borderWidth, CSS_LENGTH, key);
    assert.ok(["boxed", "underline"].includes(controls.inputStyle), key);
  }
  // Classic and Atelier declare none: they render exactly as before.
  assert.equal(getTemplateDefinition("classic").theme.controls, undefined);
  assert.equal(getTemplateDefinition("atelier").theme.controls, undefined);
});

test("control tokens become --sf-control-* / --sf-input-* variables; partial overrides keep the other defaults", () => {
  const classic = getTemplateDefinition("classic");
  const tokens = classic.theme.palettes.light.tokens;
  const boxed = semanticCssVariables(tokens, "#0f766e", classic.theme.radius);
  assert.equal(boxed["--sf-control-font-weight"], "600");
  assert.equal(boxed["--sf-control-height-md"], "2.75rem");
  assert.equal(boxed["--sf-input-border-width"], "1px");
  assert.equal(boxed["--sf-input-radius"], classic.theme.radius.control);
  assert.equal(boxed["--sf-input-background"], tokens.surface);
  assert.equal(boxed["--sf-input-padding-x"], "0.75rem");

  const underline = semanticCssVariables(tokens, "#0f766e", classic.theme.radius, {
    textTransform: "uppercase",
    letterSpacing: "0.18em",
    height: { lg: "3.5rem" },
    borderWidth: "2px",
    inputStyle: "underline",
  });
  assert.equal(underline["--sf-control-text-transform"], "uppercase");
  assert.equal(underline["--sf-control-letter-spacing"], "0.18em");
  assert.equal(underline["--sf-control-font-weight"], "600", "unspecified tokens keep their default");
  assert.equal(underline["--sf-control-height-sm"], "2.25rem");
  assert.equal(underline["--sf-control-height-lg"], "3.5rem");
  assert.equal(underline["--sf-input-border-width"], "0 0 2px");
  assert.equal(underline["--sf-input-radius"], "0");
  assert.equal(underline["--sf-input-background"], "transparent");
  assert.equal(underline["--sf-input-padding-x"], "0");
  for (const value of Object.values(underline)) assert.doesNotMatch(value, /[;{}<>"'()]|url|expression|javascript/i);
});

test("accent foreground picks the more readable of white and near-black", () => {
  assert.equal(readableForeground("#0f766e"), "#ffffff");
  assert.equal(readableForeground("#000000"), "#ffffff");
  assert.equal(readableForeground("#ffffff"), "#111111");
  assert.equal(readableForeground("#f5d76e"), "#111111");
});
