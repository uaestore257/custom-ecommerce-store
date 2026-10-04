import type { Metadata } from "next";
import { headers } from "next/headers";
import { BusinessHomePage } from "@/components/platform/BusinessSite";
import { getDb } from "@/lib/server/db";
import { getPlatformName } from "@/lib/server/platform-brand";
import { getFeaturedProducts, getRequestStorefront } from "@/lib/server/storefront/catalog";
import { requireStorefrontPage } from "@/lib/server/storefront/page";
import { getPublicStorefrontSeoContext, storefrontPageMetadata } from "@/lib/server/storefront/seo";
import { isPlatformBusinessHost, isStorefrontPathPreviewHost, platformRootUrl, storeHostConfig } from "@/lib/store-host";
import { buildStoreOrganizationJsonLd, serializeJsonLd } from "@/lib/storefront-seo";

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host") ?? "";
  const isBusinessHost = isPlatformBusinessHost(host);
  const isPathPreviewHost = isStorefrontPathPreviewHost(host);
  if (isBusinessHost && !isPathPreviewHost) {
    const canonical = platformRootUrl("/", process.env.BETTER_AUTH_URL ?? "", storeHostConfig());
    return {
      title: { absolute: await getPlatformName() },
      description: "Ecommerce services and store portfolio.",
      alternates: canonical ? { canonical } : undefined,
    };
  }
  if (isPathPreviewHost && !(await getRequestStorefront())) {
    return {
      title: { absolute: await getPlatformName() },
      description: "Ecommerce services and store portfolio.",
      robots: { index: false, follow: false },
    };
  }
  const context = await getPublicStorefrontSeoContext();
  if (!context) return { robots: { index: false, follow: false } };
  return storefrontPageMetadata({
    title: context.store.name,
    description: context.store.tagline || context.store.heroText || `${context.store.name} online store.`,
    path: "/",
    imageUrl: context.store.logoUrl,
  });
}

// The store's homepage, composed by its template from the store's own
// content (Admin → Store settings) and a bounded featured selection.
export default async function Home() {
  const host = (await headers()).get("host") ?? "";
  const isBusinessHost = isPlatformBusinessHost(host);
  if (isBusinessHost && !isStorefrontPathPreviewHost(host)) return <BusinessHomePage />;
  if (isBusinessHost && !(await getRequestStorefront())) return <BusinessHomePage />;

  const { context, template } = await requireStorefrontPage();
  const [seo, featured] = await Promise.all([
    getPublicStorefrontSeoContext(),
    getFeaturedProducts(getDb(), context.store.id, template.homepageProductCount),
  ]);
  const description = context.store.tagline || context.store.heroText || `${context.store.name} online store.`;
  const structuredData = seo ? serializeJsonLd(buildStoreOrganizationJsonLd(seo, description)) : null;
  const { Home: TemplateHome } = template;
  return (
    <>
      {structuredData ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} /> : null}
      <TemplateHome {...context} featured={featured} />
    </>
  );
}
