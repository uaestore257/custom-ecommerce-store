import type { Metadata } from "next";
import { HomeView } from "@/components/storefront/HomeView";
import { BusinessHomePage } from "@/components/platform/BusinessSite";
import { getRequestStorefront } from "@/lib/server/storefront/catalog";
import { headers } from "next/headers";
import { isPlatformBusinessHost } from "@/lib/store-host";

export async function generateMetadata(): Promise<Metadata> {
  if (isPlatformBusinessHost((await headers()).get("host") ?? "")) {
    return { title: { absolute: "UAE Store" }, description: "Ecommerce services and store portfolio." };
  }
  const { catalog } = await getRequestStorefront();
  if (!catalog) return {};
  const { store } = catalog;
  return {
    title: { absolute: store.name },
    description: store.tagline || store.heroText || undefined,
  };
}

// Homepage content (hero text, featured products, categories) comes from
// the shown store's database record, so it can be rebranded per store in
// Admin → Store settings without editing this file.
export default async function Home() {
  if (isPlatformBusinessHost((await headers()).get("host") ?? "")) return <BusinessHomePage />;
  return <HomeView />;
}
