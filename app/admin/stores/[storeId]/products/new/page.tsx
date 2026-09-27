import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/ProductForm";
import { listAdminCategories } from "@/lib/server/admin/categories";
import { getProductStore } from "@/lib/server/admin/products";
import { requireAdminPage } from "@/lib/server/admin/request";

export const metadata: Metadata = { title: "Add product" };

export default async function NewProductPage({ params }: PageProps<"/admin/stores/[storeId]/products/new">) {
  const { storeId } = await params;
  const { db: client } = await requireAdminPage();
  const [store, categories] = await Promise.all([getProductStore(client, storeId), listAdminCategories(client, storeId)]);
  if (!store || !categories) notFound();
  return <ProductForm categories={categories} minorUnits={store.minorUnits} />;
}
