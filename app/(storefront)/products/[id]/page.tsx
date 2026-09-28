import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductView } from "@/components/storefront/ProductView";
import { getRequestStorefront, getRequestStorefrontProduct } from "@/lib/server/storefront/catalog";

export async function generateMetadata({ params }: PageProps<"/products/[id]">): Promise<Metadata> {
  const { id } = await params;
  const [product, { catalog }] = await Promise.all([getRequestStorefrontProduct(id), getRequestStorefront()]);
  if (!product || !catalog) return { title: "Product not found" };
  return {
    title: `${product.name} · ${catalog.store.name}`,
    description: product.description.slice(0, 160) || undefined,
  };
}

// Only an ACTIVE product of the store being shown is found; anything else
// (missing, draft, archived, or another store's) is a 404.
export default async function ProductPage({ params }: PageProps<"/products/[id]">) {
  const { id } = await params;
  const product = await getRequestStorefrontProduct(id);
  if (!product) notFound();
  return <ProductView product={product} />;
}
