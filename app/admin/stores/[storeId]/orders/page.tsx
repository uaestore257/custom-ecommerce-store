import type { Metadata } from "next";
import { OrdersListView } from "@/components/admin/OrdersViews";

export const metadata: Metadata = { title: "Orders" };

export default function OrdersPage() {
  return <OrdersListView />;
}
