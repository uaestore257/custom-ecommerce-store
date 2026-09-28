import type { Metadata } from "next";
import { ShopView } from "@/components/storefront/ShopView";
import { getRequestStorefront } from "@/lib/server/storefront/catalog";

export async function generateMetadata(): Promise<Metadata> {
  const { catalog } = await getRequestStorefront();
  return catalog
    ? { title: `Shop · ${catalog.store.name}`, description: `Browse all products from ${catalog.store.name}.` }
    : { title: "Shop" };
}

export default async function ShopPage({ searchParams }: PageProps<"/shop">) {
  // /shop?category=<categoryId> pre-selects a category (used by the homepage).
  const { category } = await searchParams;
  return <ShopView initialCategory={typeof category === "string" ? category : ""} />;
}
