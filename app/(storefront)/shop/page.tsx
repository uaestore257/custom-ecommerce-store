import type { Metadata } from "next";
import { ShopView } from "@/components/storefront/ShopView";

export const metadata: Metadata = {
  title: "Shop",
  description: "Browse all products in the store.",
};

export default async function ShopPage({ searchParams }: PageProps<"/shop">) {
  // /shop?category=<categoryId> pre-selects a category (used by the homepage).
  const { category } = await searchParams;
  return <ShopView initialCategory={typeof category === "string" ? category : ""} />;
}
