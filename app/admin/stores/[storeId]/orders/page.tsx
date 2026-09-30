import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DbOrdersList } from "@/components/admin/DbOrdersList";
import { listAdminOrders } from "@/lib/server/admin/orders";
import { requireStorePage } from "@/lib/server/admin/request";
import { getAdminStore } from "@/lib/server/admin/stores";

export const metadata: Metadata = { title: "Orders" };

// This store's orders from the database. Only the
// platform owner or this store's owner reaches it (requireStorePage), and only the
// store in the URL is read.
export default async function OrdersPage({ params }: PageProps<"/admin/stores/[storeId]/orders">) {
  const { storeId } = await params;
  const { db: client, grant } = await requireStorePage(storeId, "orders");
  const [store, orders] = await Promise.all([getAdminStore(client, storeId), listAdminOrders(client, storeId)]);
  if (!store || !orders) notFound();
  return <DbOrdersList orders={orders} storeId={store.id} storeName={store.name} readOnly={grant.access === "read"} />;
}
