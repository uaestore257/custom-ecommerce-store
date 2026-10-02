import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StoreDomainsView } from "@/components/admin/StoreDomainsView";
import { mayAccessStoreSection } from "@/lib/admin/store-access";
import { listStoreDomains } from "@/lib/server/admin/domains";
import { requireAdminViewer } from "@/lib/server/admin/request";

export const metadata: Metadata = { title: "Custom domains" };

export default async function StoreDomainsPage() {
  const { db, viewer } = await requireAdminViewer();
  if (viewer.kind !== "store" || !mayAccessStoreSection(viewer.role, "domains")) notFound();

  const [store, domains] = await Promise.all([
    db.store.findUnique({ where: { id: viewer.store.id }, select: { name: true } }),
    listStoreDomains(db, viewer.store.id),
  ]);
  if (!store) notFound();

  return <StoreDomainsView storeName={store.name} domains={domains} readOnly={viewer.access === "read"} />;
}
