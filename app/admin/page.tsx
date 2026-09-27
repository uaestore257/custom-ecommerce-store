import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { requireAdminPage } from "@/lib/server/admin/request";
import { listAdminStores } from "@/lib/server/admin/stores";

export default async function AdminPage() {
  const stores = await listAdminStores((await requireAdminPage()).db);
  return <AdminDashboard stores={stores} />;
}
