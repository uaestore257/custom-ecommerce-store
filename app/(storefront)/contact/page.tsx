import type { Metadata } from "next";
import { ContactView } from "@/components/storefront/ContactView";
import { ContactPage as BusinessContactPage } from "@/components/platform/site/pages/ContactPage";
import { getDb } from "@/lib/server/db";
import { getPlatformName } from "@/lib/server/platform-brand";
import { platformSitePageMetadata } from "@/lib/server/platform/site-metadata";
import { headers } from "next/headers";
import { isPlatformBusinessHost, isStorefrontPathPreviewHost } from "@/lib/store-host";
import { requireStorefrontPage } from "@/lib/server/storefront/page";
import { storefrontPageMetadata } from "@/lib/server/storefront/seo";

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host") ?? "";
  if (isPlatformBusinessHost(host) && isStorefrontPathPreviewHost(host)) {
    return { title: "Contact", robots: { index: false, follow: false } };
  }
  if (isPlatformBusinessHost(host)) {
    return platformSitePageMetadata({
      path: "/contact",
      title: "Start a project",
      description: "Start a project: tell us about your business and what you want to build, and we'll come back with how we would approach it.",
    });
  }
  return storefrontPageMetadata({
    title: "Contact",
    description: "Contact the store for product and order enquiries.",
    path: "/contact",
  });
}

export default async function ContactPage() {
  if (isPlatformBusinessHost((await headers()).get("host") ?? "")) {
    const settings = await getDb().platformSettings.findUnique({ where: { id: 1 }, select: { contactEmail: true } });
    return <BusinessContactPage platformName={await getPlatformName()} email={settings?.contactEmail?.trim() || null} />;
  }
  const { context } = await requireStorefrontPage();
  return <ContactView store={context.store} />;
}
