import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoriesView } from "@/components/admin/CategoriesView";
import { listAdminCategories } from "@/lib/server/admin/categories";
import { requireAdminPage } from "@/lib/server/admin/request";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage({ params }: PageProps<"/admin/stores/[storeId]/categories">) {
  const { storeId } = await params;
  const categories = await listAdminCategories((await requireAdminPage()).db, storeId);
  if (!categories) notFound();
  return <CategoriesView categories={categories} />;
}
