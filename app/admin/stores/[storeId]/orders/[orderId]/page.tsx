import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DbOrderDetail } from "@/components/admin/DbOrderDetail";
import { getAdminOrder } from "@/lib/server/admin/orders";
import { requireStorePage } from "@/lib/server/admin/request";
import { getAdminStore } from "@/lib/server/admin/stores";

export const metadata: Metadata = { title: "Order details" };

// One order from the database. Scoped by BOTH ids: an order of another
// store is "not found". Only the signed-in platform owner reaches it.
export default async function OrderDetailPage({ params }: PageProps<"/admin/stores/[storeId]/orders/[orderId]">) {
  const { storeId, orderId } = await params;
  const { db: client } = await requireStorePage(storeId);
  const [store, order] = await Promise.all([getAdminStore(client, storeId), getAdminOrder(client, storeId, orderId)]);
  if (!store || !order) notFound();
  return <DbOrderDetail storeId={store.id} storeName={store.name} order={order} />;
}
