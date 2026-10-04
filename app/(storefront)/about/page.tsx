import type { Metadata } from "next";
import { headers } from "next/headers";
import { AboutView } from "@/components/storefront/AboutView";
import { BusinessContentPage } from "@/components/platform/BusinessSite";
import { getPlatformName } from "@/lib/server/platform-brand";
import { getRequestStorefront } from "@/lib/server/storefront/catalog";
import { requireStorefrontPage } from "@/lib/server/storefront/page";
import { getPublicStorefrontSeoContext, storefrontPageMetadata } from "@/lib/server/storefront/seo";
import { isPlatformBusinessHost, isStorefrontPathPreviewHost, platformRootUrl, storeHostConfig } from "@/lib/store-host";

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host") ?? "";
  if (isPlatformBusinessHost(host) && isStorefrontPathPreviewHost(host)) {
    return { title: `About ${await getPlatformName()}`, robots: { index: false, follow: false } };
  }
  if (isPlatformBusinessHost(host)) {
    const canonical = platformRootUrl("/about", process.env.BETTER_AUTH_URL ?? "", storeHostConfig());
    return { title: `About ${await getPlatformName()}`, alternates: canonical ? { canonical } : undefined };
  }
  const context = await getPublicStorefrontSeoContext();
  if (!context) return { title: "About", robots: { index: false, follow: false } };
  const storefront = await getRequestStorefront();
  return storefrontPageMetadata({
    title: `About ${context.store.name}`,
    description: storefront?.store.aboutText || `Learn about ${context.store.name}.`,
    path: "/about",
  });
}

export default async function AboutPage() {
  if (isPlatformBusinessHost((await headers()).get("host") ?? "")) {
    return (
      <BusinessContentPage
        title={`About ${await getPlatformName()}`}
        eyebrow="About"
        description="We help businesses launch and manage their own online stores."
      />
    );
  }
  const { context } = await requireStorefrontPage();
  return <AboutView {...context} />;
}
