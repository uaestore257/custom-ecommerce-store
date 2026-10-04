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
    description: "Ecommerce, websites, mobile apps, AI solutions, automation, SEO and custom software — complete digital solutions from one studio.",
  });
}

export default async function ServicesPage() {
  if (!isPlatformBusinessHost((await headers()).get("host") ?? "")) notFound();
  return <BusinessServicesPage />;
}
