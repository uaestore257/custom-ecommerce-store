import "server-only";
import { cache } from "react";
import { isShowcasedTemplate, TEMPLATE_EDITORIAL } from "@/lib/platform/showcase";
import { STORE_DEMO_SERVICE_SLUG, storeIndustryLabel, workCategories, type WorkCategory, type WorkDemo } from "@/lib/platform/work";
import type { Client } from "@/lib/server/admin/common";
import { getDb } from "@/lib/server/db";
import { storefrontPreviewUrlForSlug, storeHostConfig } from "@/lib/store-host";
import { getTemplateDefinition, isTemplateKey, type TemplateKey } from "@/lib/templates/registry";

/** Upper bound on demo stores read for the public Work page. */
export const MAX_WORK_DEMOS = 48;

/**
 * The demo storefronts Work may show publicly, oldest first. A store
 * qualifies only if the platform owner marked it as a demo (Store.isDemo)
 * AND it is ACTIVE and not archived AND its template is registered AND it
 * has at least one ACTIVE product AND the host resolver gives it a
 * storefront URL. Client stores (isDemo = false) can never match.
 *
 * Only presentation facts are selected — name, industry, template,
 * tagline, slug — never owners, customers, orders or payment settings.
 * Two bounded queries, whatever the number of stores.
 */
export async function loadWorkDemoStores(client: Client, urlForSlug: (slug: string) => string | null): Promise<WorkDemo[]> {
  const stores = await client.store.findMany({
    where: { isDemo: true, status: "ACTIVE", archivedAt: null },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: MAX_WORK_DEMOS,
    select: {
      id: true,
      name: true,
      slug: true,
      businessType: true,
      templateKey: true,
      defaultLanguage: true,
      _count: { select: { products: { where: { status: "ACTIVE" } } } },
    },
  });

  // The showcase screenshots (public/showcase) were captured from each
  // showcased template's FIRST demo store — the same one the case studies
  // link to (listTemplateDemoStores order) — so only that store may use them.
  const capturedStore = new Map<TemplateKey, string>();
  for (const store of stores) {
    if (isTemplateKey(store.templateKey) && !capturedStore.has(store.templateKey)) capturedStore.set(store.templateKey, store.id);
  }

  const live = stores.filter((store) => store._count.products > 0 && isTemplateKey(store.templateKey));
  if (live.length === 0) return [];

  const content = await client.storeContentTranslation.findMany({
    where: { OR: live.map((store) => ({ storeId: store.id, locale: store.defaultLanguage })) },
    select: { storeId: true, tagline: true },
  });
  const tagline = new Map(content.map((row) => [row.storeId, row.tagline?.trim() || null]));

  return live.flatMap((store) => {
    const url = urlForSlug(store.slug);
    if (!url || !isTemplateKey(store.templateKey)) return [];
    const key = store.templateKey;
    const editorial = TEMPLATE_EDITORIAL[key];
    return [
      {
        name: store.name,
        industry: storeIndustryLabel(store.businessType),
        templateKey: key,
        templateName: getTemplateDefinition(key).manifest.name,
        tagline: tagline.get(store.id) ?? null,
        headline: editorial.headline,
        signatures: editorial.signatures.map((signature) => signature.title),
        url,
        screenshots: isShowcasedTemplate(key) && capturedStore.get(key) === store.id ? key : null,
      },
    ];
  });
}

/**
 * Work's categories for this request. If the lookup fails the page still
 * renders, just without live demos (never with invented ones).
 */
export const getWorkCategories = cache(async (): Promise<WorkCategory[]> => {
  try {
    const config = storeHostConfig();
    const baseUrl = process.env.BETTER_AUTH_URL ?? "";
    const stores = await loadWorkDemoStores(getDb(), (slug) => storefrontPreviewUrlForSlug(slug, baseUrl, config));
    return workCategories({ [STORE_DEMO_SERVICE_SLUG]: stores });
  } catch (error) {
    console.error("Work: demo store lookup failed", error);
    return [];
  }
});
