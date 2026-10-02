import type { MetadataRoute } from "next";
import { getPublicStorefrontSeoContext } from "@/lib/server/storefront/seo";
import { getRequestStorefront } from "@/lib/server/storefront/catalog";
import { buildStorefrontSitemapUrls } from "@/lib/storefront-seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const context = await getPublicStorefrontSeoContext();
  if (!context) return [];
  const { catalog } = await getRequestStorefront();
  if (!catalog || catalog.store.id !== context.store.id) return [];
  return buildStorefrontSitemapUrls(context, catalog.products, catalog.categories).map((url) => ({ url }));
}
