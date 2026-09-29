import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { requireAdminViewer } from "@/lib/server/admin/request";
import { listAdminStores } from "@/lib/server/admin/stores";

// The platform dashboard (all stores). A store owner has no platform
// dashboard: /admin on their store's host goes straight to their store.
export default async function AdminPage() {
  const { db, viewer } = await requireAdminViewer();
  if (viewer.kind === "store") redirect(`/admin/stores/${viewer.store.id}`);
  const stores = await listAdminStores(db);
  return <AdminDashboard stores={stores} />;
}
