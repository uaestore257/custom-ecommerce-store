import type { Metadata } from "next";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: PageProps<"/admin/stores/[storeId]/products/[productId]">) {
  const { productId } = await params;
  return <ProductForm productId={productId} />;
}
