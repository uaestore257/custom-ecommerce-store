import "server-only";
import { cache } from "react";
import { INDUSTRY_SERVICE_ITEM, isIndustryType, workCategories, type WorkCategory, type WorkDemoStore } from "@/lib/platform/work";
import type { Client } from "@/lib/server/admin/common";
import { getDb } from "@/lib/server/db";
import { storefrontPreviewUrlForSlug, storeHostConfig } from "@/lib/store-host";
import { getTemplateDefinition, isTemplateKey } from "@/lib/templates/registry";

/** Upper bound on demo stores read for the public Work page. */
export const MAX_WORK_DEMOS = 48;

/**
 * The demo stores Work may show publicly, oldest first. A store qualifies
 * only if the platform owner marked it as a demo (Store.isDemo) AND it is
 * ACTIVE and not archived AND its template is registered AND its
 * businessType is one of the Services industries AND it has at least one
 * ACTIVE product AND the host resolver gives it a storefront URL. Client
 * stores (isDemo = false) can never match, whatever their data.
 *
 * Only presentation facts are selected — name, industry, template,
 * tagline, slug — never owners, customers, orders or payment settings.
 * Two bounded queries, whatever the number of stores.
 */
export async function loadWorkDemoStores(client: Client, urlForSlug: (slug: string) => string | null): Promise<WorkDemoStore[]> {
  const stores = await client.store.findMany({
    where: {
      isDemo: true,
      status: "ACTIVE",
      archivedAt: null,
      businessType: { in: Object.keys(INDUSTRY_SERVICE_ITEM) },
    },
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
  const live = stores.filter((store) => store._count.products > 0 && isTemplateKey(store.templateKey) && isIndustryType(store.businessType));
  if (live.length === 0) return [];

  const content = await client.storeContentTranslation.findMany({
    where: { OR: live.map((store) => ({ storeId: store.id, locale: store.defaultLanguage })) },
    select: { storeId: true, tagline: true },
  });
  const tagline = new Map(content.map((row) => [row.storeId, row.tagline?.trim() || null]));

  return live.flatMap((store) => {
    const url = urlForSlug(store.slug);
    if (!url || !isTemplateKey(store.templateKey) || !isIndustryType(store.businessType)) return [];
    return [
      {
        name: store.name,
        industry: store.businessType,
        templateKey: store.templateKey,
        templateName: getTemplateDefinition(store.templateKey).manifest.name,
        tagline: tagline.get(store.id) ?? null,
        url,
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
    const demos = await loadWorkDemoStores(getDb(), (slug) => storefrontPreviewUrlForSlug(slug, baseUrl, config));
    return workCategories(demos);
  } catch (error) {
    console.error("Work: demo store lookup failed", error);
    return [];
  }
});
