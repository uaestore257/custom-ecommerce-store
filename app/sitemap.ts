import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getDb } from "@/lib/server/db";
import { getRequestStorefront, getSitemapProducts } from "@/lib/server/storefront/catalog";
import { getPublicStorefrontSeoContext } from "@/lib/server/storefront/seo";
import { buildStorefrontSitemapUrls } from "@/lib/storefront-seo";
import { isPlatformBusinessHost, isStorefrontPathPreviewHost, platformRootUrl, storeHostConfig } from "@/lib/store-host";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = (await headers()).get("host") ?? "";
  if (isPlatformBusinessHost(host) && !isStorefrontPathPreviewHost(host)) {
    const config = storeHostConfig();
    const baseUrl = process.env.BETTER_AUTH_URL ?? "";
    return ["/", "/portfolio", "/services", "/platform", "/about", "/contact"]
      .map((path) => platformRootUrl(path, baseUrl, config))
      .filter((url): url is string => url !== null)
      .map((url) => ({ url }));
  }
  const context = await getPublicStorefrontSeoContext();
  // Demo stores are never indexed, so they publish no sitemap entries.
  if (!context || context.store.isDemo) return [];
  const storefront = await getRequestStorefront();
  if (!storefront || storefront.store.id !== context.store.id) return [];
  const products = await getSitemapProducts(getDb(), storefront.store.id);
  return buildStorefrontSitemapUrls(context, products, storefront.categories).map((url) => ({ url }));
}
