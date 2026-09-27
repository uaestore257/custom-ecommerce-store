import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StoreSettingsView } from "@/components/admin/StoreSettingsView";
import { getReferenceOptions } from "@/lib/server/admin/reference";
import { adminDb } from "@/lib/server/admin/request";
import { getAdminStoreDetail } from "@/lib/server/admin/stores";

export const metadata: Metadata = { title: "Store settings" };

export default async function StoreSettingsPage({ params }: PageProps<"/admin/stores/[storeId]/settings">) {
  const { storeId } = await params;
  const client = await adminDb();
  const [store, reference] = await Promise.all([getAdminStoreDetail(client, storeId), getReferenceOptions(client)]);
  if (!store) notFound();
  return <StoreSettingsView store={store} reference={reference} />;
}
