import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { BusinessContentPage } from "@/components/platform/BusinessSite";
import { isPlatformBusinessHost } from "@/lib/store-host";

export const metadata: Metadata = { title: "Services" };

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
