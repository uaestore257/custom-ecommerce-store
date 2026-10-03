import type { Metadata } from "next";
import { AgencySettingsView } from "@/components/admin/AgencySettingsView";
import { StoreOwnerSettingsView } from "@/components/admin/StoreOwnerSettingsView";
import { getAdminStorePaymentSettings } from "@/lib/server/admin/stores";
import { requireAdminViewer } from "@/lib/server/admin/request";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const { viewer } = await requireAdminViewer();
  return { title: viewer.kind === "platform" ? "Agency settings" : "Store Settings" };
}

export default async function AgencySettingsPage() {
  const { db, viewer } = await requireAdminViewer();
  if (viewer.kind === "platform") return <AgencySettingsView />;
  if (viewer.kind !== "store") notFound();
  if (viewer.role !== "OWNER") notFound();

  const store = await getAdminStorePaymentSettings(db, viewer.store.id);
  if (!store) notFound();
  return <StoreOwnerSettingsView store={store} readOnly={viewer.access === "read"} />;
}
