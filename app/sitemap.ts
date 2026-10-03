import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getPublicStorefrontSeoContext } from "@/lib/server/storefront/seo";
import { getRequestStorefront } from "@/lib/server/storefront/catalog";
import { buildStorefrontSitemapUrls } from "@/lib/storefront-seo";
import { isPlatformBusinessHost, isStorefrontPathPreviewHost, platformRootUrl, storeHostConfig } from "@/lib/store-host";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = (await headers()).get("host") ?? "";
  if (isPlatformBusinessHost(host) && !isStorefrontPathPreviewHost(host)) {
    const config = storeHostConfig();
    const baseUrl = process.env.BETTER_AUTH_URL ?? "";
    return ["/", "/about", "/services", "/portfolio", "/contact"]
      .map((path) => platformRootUrl(path, baseUrl, config))
      .filter((url): url is string => url !== null)
      .map((url) => ({ url }));
  }
  const context = await getPublicStorefrontSeoContext();
  if (!context) return [];
  const { catalog } = await getRequestStorefront();
  if (!catalog || catalog.store.id !== context.store.id) return [];
  return buildStorefrontSitemapUrls(context, catalog.products, catalog.categories).map((url) => ({ url }));
}
