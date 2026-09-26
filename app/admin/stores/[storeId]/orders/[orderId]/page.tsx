import type { Metadata } from "next";
import { OrderDetailView } from "@/components/admin/OrdersViews";

export const metadata: Metadata = { title: "Order details" };

export default async function OrderDetailPage({ params }: PageProps<"/admin/stores/[storeId]/orders/[orderId]">) {
  const { orderId } = await params;
  return <OrderDetailView orderId={orderId} />;
}
