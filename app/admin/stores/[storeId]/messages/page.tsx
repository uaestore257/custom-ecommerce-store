import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InquiryInbox } from "@/components/admin/InquiryInbox";
import { listAdminInquiries } from "@/lib/server/admin/inquiries";
import { requireStorePage } from "@/lib/server/admin/request";
import { getAdminStore } from "@/lib/server/admin/stores";

export const metadata: Metadata = { title: "Messages" };

// Contact messages sent from this store's storefront, from the database.
// Only the platform owner or this store's owner reaches it (requireStorePage), and
// only the store in the URL is read.
export default async function MessagesPage({ params }: PageProps<"/admin/stores/[storeId]/messages">) {
  const { storeId } = await params;
  const { db: client } = await requireStorePage(storeId);
  const [store, inquiries] = await Promise.all([getAdminStore(client, storeId), listAdminInquiries(client, storeId)]);
  if (!store || !inquiries) notFound();
  return <InquiryInbox storeId={store.id} storeName={store.name} inquiries={inquiries} />;
}
