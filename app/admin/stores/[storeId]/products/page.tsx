import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductsListView } from "@/components/admin/ProductsListView";
import { listAdminCategories } from "@/lib/server/admin/categories";
import { listAdminProducts } from "@/lib/server/admin/products";
import { requireStorePage } from "@/lib/server/admin/request";

export const metadata: Metadata = { title: "Products" };

export default async function ProductsPage({ params }: PageProps<"/admin/stores/[storeId]/products">) {
  const { storeId } = await params;
  const { db: client } = await requireStorePage(storeId);
  const [products, categories] = await Promise.all([listAdminProducts(client, storeId), listAdminCategories(client, storeId)]);
  if (!products || !categories) notFound();
  return <ProductsListView products={products} categories={categories} />;
}
