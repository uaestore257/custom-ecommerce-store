import type { Metadata } from "next";
import { AboutView } from "@/components/storefront/AboutView";
import { getRequestStorefront } from "@/lib/server/storefront/catalog";

export async function generateMetadata(): Promise<Metadata> {
  const { catalog } = await getRequestStorefront();
  return { title: catalog ? `About ${catalog.store.name}` : "About" };
}

export default function AboutPage() {
  return <AboutView />;
}
