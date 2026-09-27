import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/ProductForm";
import { listAdminCategories } from "@/lib/server/admin/categories";
import { getAdminProduct, getProductStore } from "@/lib/server/admin/products";
import { requireAdminPage } from "@/lib/server/admin/request";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: PageProps<"/admin/stores/[storeId]/products/[productId]">) {
  const { storeId, productId } = await params;
  const { db: client } = await requireAdminPage();
  // Scoped by BOTH ids: a product of another store is "not found".
  const [store, product, categories] = await Promise.all([
    getProductStore(client, storeId),
    getAdminProduct(client, storeId, productId),
    listAdminCategories(client, storeId),
  ]);
  if (!store || !product || !categories) notFound();
  return <ProductForm key={product.id} product={product} categories={categories} minorUnits={store.minorUnits} />;
}
