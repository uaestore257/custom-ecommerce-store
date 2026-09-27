import type { Metadata } from "next";
import { StoresListView } from "@/components/admin/StoresListView";
import { requireAdminPage } from "@/lib/server/admin/request";
import { listAdminStores } from "@/lib/server/admin/stores";

export const metadata: Metadata = { title: "Client stores" };

export default async function StoresPage() {
  const stores = await listAdminStores((await requireAdminPage()).db, { includeArchived: true });
  return <StoresListView stores={stores} />;
}
