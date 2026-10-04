import { atelierDefinition } from "@/templates/atelier/definition";
import { classicDefinition } from "@/templates/classic/definition";
import { kineticDefinition } from "@/templates/kinetic/definition";
import type { TemplateDefinition, TemplateManifest } from "./types";

// ---------------------------------------------------------------
// TEMPLATE REGISTRY (compile-time; pure — no React, no database)
//
// The single list of templates that exist. Adding a template means adding
// its definition here AND its components in templates/index.ts; the
// Record<TemplateKey, …> types make a half-registered template a type
// error. Store.templateKey values are resolved through resolveTemplateKey():
// anything that is not a registered key (a removed template, a typo,
// tampered data) renders DEFAULT_TEMPLATE_KEY instead of failing.
// ---------------------------------------------------------------

export const TEMPLATE_KEYS = ["classic", "atelier", "kinetic"] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

/** New stores, and stores whose key is unknown, use this template. Matches the Store.templateKey column default. */
export const DEFAULT_TEMPLATE_KEY: TemplateKey = "classic";

const DEFINITIONS: Readonly<Record<TemplateKey, TemplateDefinition>> = {
  classic: classicDefinition,
  atelier: atelierDefinition,
  kinetic: kineticDefinition,
};

export function isTemplateKey(value: unknown): value is TemplateKey {
  return typeof value === "string" && (TEMPLATE_KEYS as readonly string[]).includes(value);
}

/** The registered template for a stored key, or the default for anything else. */
export function resolveTemplateKey(value: unknown): TemplateKey {
  return isTemplateKey(value) ? value : DEFAULT_TEMPLATE_KEY;
}

export function getTemplateDefinition(key: TemplateKey): TemplateDefinition {
  return DEFINITIONS[key];
}

/** Every template's manifest, in registry order (for catalogues and the admin selector). */
export function listTemplateManifests(): TemplateManifest[] {
  return TEMPLATE_KEYS.map((key) => DEFINITIONS[key].manifest);
}
