import type { Metadata } from "next";
import { ContactView } from "@/components/storefront/ContactView";
import { BusinessContactPage } from "@/components/platform/BusinessSite";
import { headers } from "next/headers";
import { isPlatformBusinessHost, isStorefrontPathPreviewHost, platformRootUrl, storeHostConfig } from "@/lib/store-host";
import { storefrontPageMetadata } from "@/lib/server/storefront/seo";

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host") ?? "";
  if (isPlatformBusinessHost(host) && isStorefrontPathPreviewHost(host)) {
    return { title: "Contact", robots: { index: false, follow: false } };
  }
  if (isPlatformBusinessHost(host)) {
    const canonical = platformRootUrl("/contact", process.env.BETTER_AUTH_URL ?? "", storeHostConfig());
    return { title: "Contact", alternates: canonical ? { canonical } : undefined };
  }
  return storefrontPageMetadata({
    title: "Contact",
    description: "Contact the store for product and order enquiries.",
    path: "/contact",
  });
}

export default async function ContactPage() {
  if (isPlatformBusinessHost((await headers()).get("host") ?? "")) {
    return <BusinessContactPage />;
  }
  return <ContactView />;
}
