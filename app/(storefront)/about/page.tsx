import type { Metadata } from "next";
import { AboutView } from "@/components/storefront/AboutView";
import { BusinessContentPage } from "@/components/platform/BusinessSite";
import { getRequestStorefront } from "@/lib/server/storefront/catalog";
import { getPublicStorefrontSeoContext, storefrontPageMetadata } from "@/lib/server/storefront/seo";
import { headers } from "next/headers";
import { isPlatformBusinessHost } from "@/lib/store-host";

export async function generateMetadata(): Promise<Metadata> {
  if (isPlatformBusinessHost((await headers()).get("host") ?? "")) {
    return { title: "About UAE Store", robots: { index: false, follow: false } };
  }
  const context = await getPublicStorefrontSeoContext();
  if (!context) return { title: "About", robots: { index: false, follow: false } };
  const { catalog } = await getRequestStorefront();
  return storefrontPageMetadata({
    title: `About ${context.store.name}`,
    description: catalog?.store.aboutText || `Learn about ${context.store.name}.`,
    path: "/about",
  });
}

export default async function AboutPage() {
  if (isPlatformBusinessHost((await headers()).get("host") ?? "")) {
    return <BusinessContentPage title="About UAE Store" eyebrow="About" description="We help businesses launch and manage their own online stores." />;
  }
  return <AboutView />;
}
