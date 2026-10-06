import { STORE_TYPES } from "@/lib/config";
import type { ShowcaseCaptureKey } from "@/lib/platform/showcase-capture";
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
// A demo appears only when a platform owner explicitly assigns it a
// canonical Services category. Store business types describe industries,
// not the Services taxonomy, and are never used to infer that assignment.
// ---------------------------------------------------------------

/** A live demo as Work shows it. Only presentation facts — never owners, orders or settings. */
export interface WorkDemo {
  name: string;
  /** The store's industry as the admin set it ("Furniture"), or null. */
  industry: string | null;
  /** Canonical Services category slug for the public Work tab. */
  serviceSlug: string;
  /** Optional display order within the category; lower numbers appear first. */
  workOrder: number | null;
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
   * Set only when a real capture of THIS store is present under public/showcase.
   * Otherwise null — a different store's screenshots are never reused.
   */
  screenshots: ShowcaseCaptureKey | null;
}

/** Live demos per Services category slug. */
export type DemosByService = Readonly<Partial<Record<string, readonly WorkDemo[]>>>;

/**
 * Accept an explicit Work category only when it is in the canonical Services
 * taxonomy. Industry/business type is intentionally not an input.
 */
export function resolveWorkServiceSlug(value: unknown): string | null {
  return typeof value === "string" && SERVICE_CATEGORIES.some((category) => category.slug === value) ? value : null;
}

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
    const ordered = [...list].sort((left, right) => {
      if (left.workOrder === null) return right.workOrder === null ? 0 : 1;
      if (right.workOrder === null) return -1;
      return left.workOrder - right.workOrder;
    });
    return ordered.length > 0 ? [{ slug: category.slug, title: category.title, demos: ordered }] : [];
  });
}
