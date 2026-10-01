import type { MetadataRoute } from "next";
import { getPublicStorefrontSeoContext } from "@/lib/server/storefront/seo";
import { buildStorefrontRobots, storefrontCanonicalUrl } from "@/lib/storefront-seo";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const context = await getPublicStorefrontSeoContext();
  if (!context) return buildStorefrontRobots(false);
  return buildStorefrontRobots(true, storefrontCanonicalUrl(context, "/sitemap.xml"));
}
