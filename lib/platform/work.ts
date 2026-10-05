import type { TemplateKey } from "@/lib/templates/registry";
import type { StoreType } from "@/lib/types";
import { SERVICE_CATEGORIES, type ServiceCategory } from "./services";

// ---------------------------------------------------------------
// WORK: LIVE DEMO STORES BY CATEGORY (pure: no React, no database)
//
// The Services page is the canonical list of what the studio builds. Its
// "Ecommerce" category names the industries we build stores for
// ("Furniture ecommerce", "Fashion ecommerce", …). Work reads that list —
// names and order — and shows an industry only when at least one valid
// public demo store exists for it. Nothing here changes Services.
//
// A demo store's industry is its explicit Store.businessType, chosen in the
// admin (never inferred from its name, slug or template). The one join
// between the two existing lists is INDUSTRY_SERVICE_ITEM below; a test
// checks that every value is an item Services really lists.
// ---------------------------------------------------------------

/** The Services category whose industry items Work presents. */
export const WORK_SERVICE_SLUG = "ecommerce";

export type IndustryType = Exclude<StoreType, "other">;

/** Store.businessType → the Services item (in the Ecommerce category) that names the same industry. */
export const INDUSTRY_SERVICE_ITEM: Readonly<Record<IndustryType, string>> = {
  furniture: "Furniture ecommerce",
  fashion: "Fashion ecommerce",
  electronics: "Electronics ecommerce",
  beauty: "Beauty ecommerce",
  grocery: "Food & grocery ecommerce",
};

export function isIndustryType(value: unknown): value is IndustryType {
  return typeof value === "string" && Object.hasOwn(INDUSTRY_SERVICE_ITEM, value);
}

/** A public demo store as Work shows it. Only presentation facts — never owners, orders or settings. */
export interface WorkDemoStore {
  name: string;
  industry: IndustryType;
  templateKey: TemplateKey;
  templateName: string;
  /** The store's own tagline, in its default language. */
  tagline: string | null;
  /** The demo storefront's homepage, from the tenant-aware host resolver. */
  url: string;
}

export interface WorkCategory {
  /** The industry (Store.businessType); also the tab id. */
  slug: IndustryType;
  /** The Services item, shortened for a tab: "Furniture ecommerce" → "Furniture". */
  title: string;
  /** The Services item exactly as Services lists it. */
  serviceItem: string;
  demos: WorkDemoStore[];
}

/** "Food & grocery ecommerce" → "Food & grocery". */
export function industryTitle(serviceItem: string): string {
  return serviceItem.replace(/\s+ecommerce$/i, "");
}

/**
 * Work's categories: the Services industry items, in Services order, each
 * with its demo stores — and only those that have at least one. A category
 * with no valid demo is left out (Services itself is unaffected).
 */
export function workCategories(
  demos: readonly WorkDemoStore[],
  services: readonly ServiceCategory[] = SERVICE_CATEGORIES,
): WorkCategory[] {
  const service = services.find((category) => category.slug === WORK_SERVICE_SLUG);
  if (!service) return [];
  const industryByItem = new Map(Object.entries(INDUSTRY_SERVICE_ITEM).map(([industry, item]) => [item, industry as IndustryType]));
  return service.items.flatMap((item) => {
    const industry = industryByItem.get(item);
    if (!industry) return [];
    const matching = demos.filter((demo) => demo.industry === industry);
    return matching.length > 0 ? [{ slug: industry, title: industryTitle(item), serviceItem: item, demos: matching }] : [];
  });
}
