import type { Metadata } from "next";
import { HomeView } from "@/components/storefront/HomeView";
import { getRequestStorefront } from "@/lib/server/storefront/catalog";

export async function generateMetadata(): Promise<Metadata> {
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
export default function Home() {
  return <HomeView />;
}
