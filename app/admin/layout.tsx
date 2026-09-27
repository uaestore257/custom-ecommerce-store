import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdminPage } from "@/lib/server/admin/request";
import { listAdminStores } from "@/lib/server/admin/stores";

export const metadata: Metadata = {
  title: { default: "Agency Admin", template: "%s | Agency Admin" },
  // Keep the admin out of search engines.
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { db, owner } = await requireAdminPage();
  // Only names and ids go to the browser for the sidebar and store selector.
  const stores = (await listAdminStores(db)).map(({ id, name }) => ({ id, name }));
  return (
    <AdminShell stores={stores} user={{ name: owner.name, email: owner.email }}>
      {children}
    </AdminShell>
  );
}
