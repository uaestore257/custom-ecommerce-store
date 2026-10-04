import type { TemplateKey } from "@/lib/templates/registry";
import { atelierTemplate } from "./atelier";
import { classicTemplate } from "./classic";
import type { StorefrontTemplate } from "./types";

// ---------------------------------------------------------------
// TEMPLATE COMPONENT REGISTRY. Record<TemplateKey, …> makes it a type
// error to register a key in lib/templates/registry.ts without its
// components here (and vice versa). Lookups take an already-resolved
// TemplateKey, so stored data can never name an arbitrary component.
// ---------------------------------------------------------------

const TEMPLATES: Readonly<Record<TemplateKey, StorefrontTemplate>> = {
  classic: classicTemplate,
  atelier: atelierTemplate,
};

export function getStorefrontTemplate(key: TemplateKey): StorefrontTemplate {
  return TEMPLATES[key];
}
