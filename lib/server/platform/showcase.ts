import "server-only";
import { cache } from "react";
import { buildDemoStoreLinks, SHOWCASE_ORDER, TEMPLATE_EDITORIAL, type TemplateShowcaseEntry } from "@/lib/platform/showcase";
import { listTemplateDemoStores } from "@/lib/server/admin/design";
import { getDb } from "@/lib/server/db";
import { getFeaturedProducts } from "@/lib/server/storefront/catalog";
import { storefrontPreviewUrlForSlug, storeHostConfig } from "@/lib/store-host";
import { productPath } from "@/lib/storefront-urls";
import { getTemplateDefinition } from "@/lib/templates/registry";

/**
 * Every registered template, in SHOWCASE_ORDER, with its portfolio copy
 * and, when one exists, links into its first public demo store (ACTIVE,
 * non-archived, isDemo — the same stores /admin/template links to). Client stores are
 * never listed. Reads are bounded: one demo-store query plus at most one
 * single-product read per template.
 *
 * Demo links are an enhancement: if the lookup fails, the templates are
 * still presented, just without "live demo" links.
 */
export const getTemplateShowcase = cache(async (): Promise<TemplateShowcaseEntry[]> => {
  const base = SHOWCASE_ORDER.map((key) => ({
    key,
    manifest: getTemplateDefinition(key).manifest,
    editorial: TEMPLATE_EDITORIAL[key],
  }));
  try {
    const db = getDb();
    const config = storeHostConfig();
    const baseUrl = process.env.BETTER_AUTH_URL ?? "";
    const demos = await listTemplateDemoStores(db);
    return await Promise.all(
      base.map(async (entry) => {
        const store = demos[entry.key]?.[0];
        if (!store) return { ...entry, demo: null };
        const url = storefrontPreviewUrlForSlug(store.slug, baseUrl, config);
        const [product] = url ? await getFeaturedProducts(db, store.id, 1) : [];
        return { ...entry, demo: buildDemoStoreLinks(store.name, url, product ? productPath(product) : null) };
      }),
    );
  } catch (error) {
    console.error("Template showcase: demo store lookup failed", error);
    return base.map((entry) => ({ ...entry, demo: null }));
  }
});
