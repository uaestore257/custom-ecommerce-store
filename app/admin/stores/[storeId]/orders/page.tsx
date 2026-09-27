import type { Metadata } from "next";
import { OrdersListView } from "@/components/admin/OrdersViews";
import { DemoStoreData } from "@/components/admin/StoreContext";

export const metadata: Metadata = { title: "Orders" };

// Orders still use browser demo data (not connected to the database yet).
export default function OrdersPage() {
  return (
    <DemoStoreData area="orders">
      <OrdersListView />
    </DemoStoreData>
  );
}
