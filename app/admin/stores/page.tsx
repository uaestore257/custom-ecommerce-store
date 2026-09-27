import type { Metadata } from "next";
import { StoresListView } from "@/components/admin/StoresListView";
import { adminDb } from "@/lib/server/admin/request";
import { listAdminStores } from "@/lib/server/admin/stores";

export const metadata: Metadata = { title: "Client stores" };

export default async function StoresPage() {
  const stores = await listAdminStores(await adminDb(), { includeArchived: true });
  return <StoresListView stores={stores} />;
}
