import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdminViewer } from "@/lib/server/admin/request";
import { listAdminStores } from "@/lib/server/admin/stores";
import { storefrontPreviewUrlForSlug, storeHostConfig } from "@/lib/store-host";

export const metadata: Metadata = {
  title: { default: "Agency Admin", template: "%s | Agency Admin" },
  // Keep the admin out of search engines.
  robots: { index: false, follow: false },
};

// The platform owner (on ADMIN_HOST) sees every store; a store member (on
// that store's dedicated admin host) sees only that store. Each page checks
// access itself (requireAdminPage / requireStorePage).
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { db, viewer } = await requireAdminViewer();
  const config = storeHostConfig();
  const baseUrl = process.env.BETTER_AUTH_URL ?? "";
  const stores =
    viewer.kind === "platform"
      ? await (async () => {
          const rows = await listAdminStores(db);
          const domains = rows.length
            ? await db.storeDomain.findMany({
                where: { storeId: { in: rows.map(({ id }) => id) }, status: "VERIFIED", isPrimary: true },
                select: { storeId: true, hostname: true },
              })
            : [];
          const primaryDomainByStore = new Map(domains.map(({ storeId, hostname }) => [storeId, hostname]));
          return rows.map(({ id, name, slug }) => ({
            id,
            name,
            slug,
            storefrontUrl: storefrontPreviewUrlForSlug(slug, baseUrl, config, primaryDomainByStore.get(id)),
          }));
        })()
      : await (async () => {
          const store = await db.store.findUnique({
            where: { id: viewer.store.id },
            select: { id: true, name: true, slug: true },
          });
          if (!store) return [];
          const primaryDomain = await db.storeDomain.findFirst({
            where: { storeId: store.id, status: "VERIFIED", isPrimary: true },
            select: { hostname: true },
          });
          return [{
            ...store,
            storefrontUrl: storefrontPreviewUrlForSlug(store.slug, baseUrl, config, primaryDomain?.hostname),
          }];
        })();
  return (
    <AdminShell
      stores={stores}
      user={{ name: viewer.user.name, email: viewer.user.email }}
      platform={viewer.kind === "platform"}
      role={viewer.kind === "store" ? viewer.role : null}
    >
      {children}
    </AdminShell>
  );
}
