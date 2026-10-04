import type { Metadata } from "next";
import { headers } from "next/headers";
import { AboutView } from "@/components/storefront/AboutView";
import { AboutPage as BusinessAboutPage } from "@/components/platform/site/pages/AboutPage";
import { getAgencyProfile } from "@/lib/server/agency";
import { getPlatformName } from "@/lib/server/platform-brand";
import { platformSitePageMetadata } from "@/lib/server/platform/site-metadata";
import { getRequestStorefront } from "@/lib/server/storefront/catalog";
import { requireStorefrontPage } from "@/lib/server/storefront/page";
import { getPublicStorefrontSeoContext, storefrontPageMetadata } from "@/lib/server/storefront/seo";
import { isPlatformBusinessHost, isStorefrontPathPreviewHost } from "@/lib/store-host";

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host") ?? "";
  if (isPlatformBusinessHost(host) && isStorefrontPathPreviewHost(host)) {
    return { title: `About ${await getPlatformName()}`, robots: { index: false, follow: false } };
  }
  if (isPlatformBusinessHost(host)) {
    return platformSitePageMetadata({
      path: "/about",
      title: "About",
      description: "An AI-first digital commerce studio that designs and engineers stores, websites, apps and AI systems — and runs its own commerce platform.",
    });
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
    return <BusinessAboutPage agency={await getAgencyProfile()} />;
  }
  const { context } = await requireStorefrontPage();
  return <AboutView {...context} />;
}
