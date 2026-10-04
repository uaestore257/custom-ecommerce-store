import type { Metadata } from "next";
import { AgencySettingsView } from "@/components/admin/AgencySettingsView";
import { StoreOwnerSettingsView } from "@/components/admin/StoreOwnerSettingsView";
import { PLATFORM_FALLBACK_NAME } from "@/lib/platform-brand";
import { getAgencySettingsForAdmin } from "@/lib/server/agency";
import { getAdminStorePaymentSettings } from "@/lib/server/admin/stores";
import { platformRootUrl, storeHostConfig } from "@/lib/store-host";
import { requireAdminViewer } from "@/lib/server/admin/request";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const { viewer } = await requireAdminViewer();
  return { title: viewer.kind === "platform" ? "Agency settings" : "Store Settings" };
}

export default async function AgencySettingsPage() {
  const { db, viewer } = await requireAdminViewer();
  if (viewer.kind === "platform") {
    // Agency settings: platform data only — the single source of truth for the public agency website.
    const settings = await getAgencySettingsForAdmin(db);
    const publicSiteUrl = platformRootUrl("/", process.env.BETTER_AUTH_URL ?? "", storeHostConfig());
    return <AgencySettingsView initial={settings} fallbackName={PLATFORM_FALLBACK_NAME} publicSiteUrl={publicSiteUrl} />;
  }
  if (viewer.kind !== "store") notFound();
  if (viewer.role !== "OWNER") notFound();

  const store = await getAdminStorePaymentSettings(db, viewer.store.id);
  if (!store) notFound();
  return <StoreOwnerSettingsView store={store} readOnly={viewer.access === "read"} />;
}
