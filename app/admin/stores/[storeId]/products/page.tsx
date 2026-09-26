import type { Metadata } from "next";
import { ProductsListView } from "@/components/admin/ProductsListView";

export const metadata: Metadata = { title: "Products" };

export default function ProductsPage() {
  return <ProductsListView />;
}
