import type { Metadata } from "next";
import { AgencySettingsView } from "@/components/admin/AgencySettingsView";
import { StoreOwnerSettingsView } from "@/components/admin/StoreOwnerSettingsView";
import { getAdminStoreDetail } from "@/lib/server/admin/stores";
import { getReferenceOptions } from "@/lib/server/admin/reference";
import { requireAdminViewer } from "@/lib/server/admin/request";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const { viewer } = await requireAdminViewer();
  return { title: viewer.kind === "platform" ? "Agency settings" : "Store Settings" };
}

export default async function AgencySettingsPage() {
  const { db, viewer } = await requireAdminViewer();
  if (viewer.kind === "platform") return <AgencySettingsView />;
  if (viewer.role !== "OWNER") notFound();

  const [store, reference] = await Promise.all([
    getAdminStoreDetail(db, viewer.store.id),
    getReferenceOptions(db),
  ]);
  if (!store) notFound();
  return <StoreOwnerSettingsView store={store} reference={reference} readOnly={viewer.access === "read"} />;
}
