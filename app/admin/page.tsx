import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { adminDb } from "@/lib/server/admin/request";
import { listAdminStores } from "@/lib/server/admin/stores";

export default async function AdminPage() {
  const stores = await listAdminStores(await adminDb());
  return <AdminDashboard stores={stores} />;
}
