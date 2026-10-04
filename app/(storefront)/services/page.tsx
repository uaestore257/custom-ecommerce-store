import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ServicesPage as BusinessServicesPage } from "@/components/platform/site/pages/ServicesPage";
import { platformSitePageMetadata } from "@/lib/server/platform/site-metadata";
import { isPlatformBusinessHost, isStorefrontPathPreviewHost } from "@/lib/store-host";

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host") ?? "";
  if (!isPlatformBusinessHost(host) || isStorefrontPathPreviewHost(host)) {
    return { title: "Services", robots: { index: false, follow: false } };
  }
  return platformSitePageMetadata({
    path: "/services",
    title: "Services",
    description: "Design, setup and launch of premium online stores: template and identity, catalogue, orders, payments, team access and your own domain.",
  });
}

export default async function ServicesPage() {
  if (!isPlatformBusinessHost((await headers()).get("host") ?? "")) notFound();
  return <BusinessServicesPage />;
}
