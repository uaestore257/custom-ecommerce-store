import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdminViewer } from "@/lib/server/admin/request";
import { listAdminStores } from "@/lib/server/admin/stores";

export const metadata: Metadata = {
  title: { default: "Agency Admin", template: "%s | Agency Admin" },
  // Keep the admin out of search engines.
  robots: { index: false, follow: false },
};

// The platform owner (on ADMIN_HOST) sees every store; a store owner (on
// their store's own host) sees only that store. Each page still checks
// access itself (requireAdminPage / requireStorePage).
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { db, viewer } = await requireAdminViewer();
  // Only names and ids go to the browser for the sidebar and store selector.
  const stores =
    viewer.kind === "platform"
      ? (await listAdminStores(db)).map(({ id, name }) => ({ id, name }))
      : await db.store.findMany({ where: { id: viewer.store.id }, select: { id: true, name: true } });
  return (
    <AdminShell stores={stores} user={{ name: viewer.user.name, email: viewer.user.email }} platform={viewer.kind === "platform"}>
      {children}
    </AdminShell>
  );
}
