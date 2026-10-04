import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { isPlatformBusinessHost, isStorefrontPathPreviewHost, platformRootUrl, storeHostConfig } from "@/lib/store-host";
import { getPublicStorefrontSeoContext } from "@/lib/server/storefront/seo";
import { buildStorefrontRobots, storefrontCanonicalUrl } from "@/lib/storefront-seo";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("host") ?? "";
  if (isPlatformBusinessHost(host) && !isStorefrontPathPreviewHost(host)) {
    const sitemap = platformRootUrl("/sitemap.xml", process.env.BETTER_AUTH_URL ?? "", storeHostConfig());
    return sitemap
      ? { rules: { userAgent: "*", allow: "/" }, sitemap }
      : { rules: { userAgent: "*", allow: "/" } };
  }
  const context = await getPublicStorefrontSeoContext();
  // Demo stores are real tenants but are never crawled.
  if (!context || context.store.isDemo) return buildStorefrontRobots(false);
  return buildStorefrontRobots(true, storefrontCanonicalUrl(context, "/sitemap.xml"));
}
