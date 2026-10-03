import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { BusinessContentPage } from "@/components/platform/BusinessSite";
import {
  isPlatformBusinessHost,
  isStorefrontPathPreviewHost,
  platformRootUrl,
  storeHostConfig,
} from "@/lib/store-host";

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host") ?? "";
  if (!isPlatformBusinessHost(host) || isStorefrontPathPreviewHost(host)) {
    return { title: "Services", robots: { index: false, follow: false } };
  }
  const canonical = platformRootUrl("/services", process.env.BETTER_AUTH_URL ?? "", storeHostConfig());
  return { title: "Services", alternates: canonical ? { canonical } : undefined };
}

export default async function ServicesPage() {
  if (!isPlatformBusinessHost((await headers()).get("host") ?? "")) notFound();
  return (
    <BusinessContentPage
      title="Ecommerce services"
      eyebrow="Services"
      description="Plan, launch and operate a dedicated online storefront, with products, categories, orders and customer messages managed in one place."
      items={["Store setup and configuration", "Product and category management", "Order and customer-message workflows"]}
    />
  );
}
