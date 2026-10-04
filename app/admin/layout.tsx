import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdminViewer } from "@/lib/server/admin/request";
import { listAdminStores } from "@/lib/server/admin/stores";
import { getPlatformName } from "@/lib/server/platform-brand";
import { storefrontPreviewUrlForSlug, storeHostConfig } from "@/lib/store-host";

export const metadata: Metadata = {
  title: { default: "Agency Admin", template: "%s | Agency Admin" },
  // Keep the admin out of search engines.
  robots: { index: false, follow: false },
};

// The platform owner sees every store; portal members see only their
// memberships; dedicated Store Admin hosts see only the named store.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { db, viewer } = await requireAdminViewer();
  const config = storeHostConfig();
  const baseUrl = process.env.BETTER_AUTH_URL ?? "";
  const rows: { id: string; name: string; slug: string; role?: "OWNER" | "MANAGER" | "STAFF" }[] =
    viewer.kind === "platform"
      ? (await listAdminStores(db)).map(({ id, name, slug }) => ({ id, name, slug, role: undefined }))
      : viewer.kind === "store-portal"
        ? viewer.stores.map(({ store, role }) => ({ ...store, role }))
        : viewer.portal && viewer.availableStores
          ? viewer.availableStores.map(({ store, role }) => ({ ...store, role }))
          : await (async () => {
              const store = await db.store.findUnique({
                where: { id: viewer.store.id },
                select: { id: true, name: true, slug: true },
              });
              return store ? [{ ...store, role: viewer.role }] : [];
            })();
  const domains = rows.length
    ? await db.storeDomain.findMany({
        where: { storeId: { in: rows.map(({ id }) => id) }, status: "VERIFIED", isPrimary: true },
        select: { storeId: true, hostname: true },
      })
    : [];
  const primaryDomainByStore = new Map(domains.map(({ storeId, hostname }) => [storeId, hostname]));
  const stores = rows.map(({ id, name, slug, role }) => ({
    id,
    name,
    slug,
    role,
    storefrontUrl: storefrontPreviewUrlForSlug(slug, baseUrl, config, primaryDomainByStore.get(id)),
  }));
  return (
    <AdminShell
      stores={stores}
      user={{ name: viewer.user.name, email: viewer.user.email }}
      platform={viewer.kind === "platform"}
      role={viewer.kind === "store" && !viewer.portal ? viewer.role : null}
      portal={viewer.kind === "store-portal" || (viewer.kind === "store" && viewer.portal)}
      selectedStoreId={viewer.kind === "store" && viewer.portal ? viewer.store.id : null}
      agencyName={await getPlatformName()}
    >
      {children}
    </AdminShell>
  );
}
