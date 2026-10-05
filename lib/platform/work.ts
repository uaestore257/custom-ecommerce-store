import { STORE_TYPES } from "@/lib/config";
import type { ShowcasedTemplateKey } from "@/lib/platform/showcase";
import type { TemplateKey } from "@/lib/templates/registry";
import { SERVICE_CATEGORIES, type ServiceCategory } from "./services";

// ---------------------------------------------------------------
// WORK: LIVE DEMOS BY SERVICE CATEGORY (pure: no React, no database)
//
// The Services page is the canonical list of what the studio offers. Work
// shows the SAME categories, in the same order — but only those that have
// at least one real, live demo. A category without a demo is simply not
// rendered in Work (Services itself is never filtered).
//
// Today the only live demos are demo storefronts (Store.isDemo): they are
// ecommerce stores, so they belong to the "ecommerce" Services category.
// Demos of other kinds can be added to their own category later through
// the same DemosByService map; until then those categories stay hidden.
// ---------------------------------------------------------------

/** The Services category every demo storefront belongs to. */
export const STORE_DEMO_SERVICE_SLUG = "ecommerce";

/** A live demo as Work shows it. Only presentation facts — never owners, orders or settings. */
export interface WorkDemo {
  name: string;
  /** The store's industry as the admin set it ("Furniture"), or null. */
  industry: string | null;
  templateKey: TemplateKey;
  templateName: string;
  /** The store's own tagline, in its default language. */
  tagline: string | null;
  /** One line about the design direction (the template's portfolio headline). */
  headline: string;
  /** The template's structural signatures, by title. */
  signatures: readonly string[];
  /** The live demo's homepage, from the tenant-aware host resolver. */
  url: string;
  /**
   * Set when real screenshots of THIS store exist: it is the showcased
   * template's first demo store, the one public/showcase was captured from
   * (scripts/capture-showcase.mjs). Otherwise null — never another store's images.
   */
  screenshots: ShowcasedTemplateKey | null;
}

/** Live demos per Services category slug. */
export type DemosByService = Readonly<Partial<Record<string, readonly WorkDemo[]>>>;

export interface WorkCategory {
  /** The Services category slug. */
  slug: string;
  /** The Services category title, exactly as Services shows it. */
  title: string;
  demos: readonly WorkDemo[];
}

/** "furniture" → "Furniture" (from the admin's store types); unknown or "other" → null. */
export function storeIndustryLabel(businessType: string | null | undefined): string | null {
  if (!businessType || businessType === "other") return null;
  const type = STORE_TYPES.find((option) => option.value === businessType);
  return type ? type.label.replace(/\s+shop$/i, "") : null;
}

/**
 * Work's categories: every Services category, in Services order, that has
 * at least one live demo — each with its demos. Nothing else.
 */
export function workCategories(demos: DemosByService, services: readonly ServiceCategory[] = SERVICE_CATEGORIES): WorkCategory[] {
  return services.flatMap((category) => {
    const list = Object.hasOwn(demos, category.slug) ? (demos[category.slug] ?? []) : [];
    return list.length > 0 ? [{ slug: category.slug, title: category.title, demos: list }] : [];
  });
}
