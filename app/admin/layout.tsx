import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminDb } from "@/lib/server/admin/request";
import { listAdminStores } from "@/lib/server/admin/stores";

export const metadata: Metadata = {
  title: { default: "Agency Admin", template: "%s | Agency Admin" },
  // Demo admin: keep it out of search engines.
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  // Only names and ids go to the browser for the sidebar and store selector.
  const stores = (await listAdminStores(await adminDb())).map(({ id, name }) => ({ id, name }));
  return <AdminShell stores={stores}>{children}</AdminShell>;
}
