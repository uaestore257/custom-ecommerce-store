import type { Metadata } from "next";
import { OrdersListView } from "@/components/admin/OrdersViews";
import { DemoStoreData } from "@/components/admin/StoreContext";
import { requireAdminPage } from "@/lib/server/admin/request";

export const metadata: Metadata = { title: "Orders" };

// Orders still use browser demo data (not connected to the database yet).
export default async function OrdersPage() {
  await requireAdminPage();
  return (
    <DemoStoreData area="orders">
      <OrdersListView />
    </DemoStoreData>
  );
}
