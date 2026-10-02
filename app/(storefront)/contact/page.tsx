import type { Metadata } from "next";
import { ContactView } from "@/components/storefront/ContactView";
import { BusinessContactPage } from "@/components/platform/BusinessSite";
import { headers } from "next/headers";
import { isPlatformBusinessHost } from "@/lib/store-host";
import { storefrontPageMetadata } from "@/lib/server/storefront/seo";

export async function generateMetadata(): Promise<Metadata> {
  if (isPlatformBusinessHost((await headers()).get("host") ?? "")) {
    return { title: "Contact", robots: { index: false, follow: false } };
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
