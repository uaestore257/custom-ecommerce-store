import type { Metadata } from "next";
import { HomeView } from "@/components/storefront/HomeView";
import { BusinessHomePage } from "@/components/platform/BusinessSite";
import { getRequestStorefront } from "@/lib/server/storefront/catalog";
import { headers } from "next/headers";
import { isPlatformBusinessHost, isStorefrontPathPreviewHost, platformRootUrl, storeHostConfig } from "@/lib/store-host";
import { storefrontPageMetadata, getPublicStorefrontSeoContext } from "@/lib/server/storefront/seo";
import { buildStoreOrganizationJsonLd, serializeJsonLd } from "@/lib/storefront-seo";

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host") ?? "";
  const isBusinessHost = isPlatformBusinessHost(host);
  const isPathPreviewHost = isStorefrontPathPreviewHost(host);
  if (isBusinessHost && !isPathPreviewHost) {
    const canonical = platformRootUrl("/", process.env.BETTER_AUTH_URL ?? "", storeHostConfig());
    return {
      title: { absolute: "UAE Store" },
      description: "Ecommerce services and store portfolio.",
      alternates: canonical ? { canonical } : undefined,
    };
  }
  if (isPathPreviewHost) {
    const { catalog } = await getRequestStorefront();
    if (!catalog) {
      return {
        title: { absolute: "UAE Store" },
        description: "Ecommerce services and store portfolio.",
        robots: { index: false, follow: false },
      };
    }
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

// Homepage content (hero text, featured products, categories) comes from
// the shown store's database record, so it can be rebranded per store in
// Admin → Store settings without editing this file.
export default async function Home() {
  const host = (await headers()).get("host") ?? "";
  const isBusinessHost = isPlatformBusinessHost(host);
  const isPathPreviewHost = isStorefrontPathPreviewHost(host);
  if (isBusinessHost && !isPathPreviewHost) return <BusinessHomePage />;
  const context = await getPublicStorefrontSeoContext();
  const { catalog } = await getRequestStorefront();
  if (isBusinessHost && !catalog) return <BusinessHomePage />;
  if (!catalog) return <HomeView />;
  const description = catalog.store.tagline || catalog.store.heroText || `${catalog.store.name} online store.`;
  const structuredData = context ? serializeJsonLd(buildStoreOrganizationJsonLd(context, description)) : null;
  return (
    <>
      {structuredData ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} /> : null}
      <HomeView />
    </>
  );
}
