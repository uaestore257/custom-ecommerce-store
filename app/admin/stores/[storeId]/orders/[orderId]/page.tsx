import type { Metadata } from "next";
import { OrderDetailView } from "@/components/admin/OrdersViews";
import { DemoStoreData } from "@/components/admin/StoreContext";
import { requireAdminPage } from "@/lib/server/admin/request";

export const metadata: Metadata = { title: "Order details" };

// Orders still use browser demo data (not connected to the database yet).
export default async function OrderDetailPage({ params }: PageProps<"/admin/stores/[storeId]/orders/[orderId]">) {
  await requireAdminPage();
  const { orderId } = await params;
  return (
    <DemoStoreData area="orders">
      <OrderDetailView orderId={orderId} />
    </DemoStoreData>
  );
}
