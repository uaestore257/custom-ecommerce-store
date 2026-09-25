import type { Metadata } from "next";
import { ProductView } from "@/components/storefront/ProductView";

export const metadata: Metadata = {
  title: "Product",
};

export default async function ProductPage({ params }: PageProps<"/products/[id]">) {
  const { id } = await params;
  // Products live in browser demo data, so the lookup (and the
  // "Product not found" state) happens in the client component.
  return <ProductView productId={id} />;
}
