import type { Metadata } from "next";
import { AgencySettingsView } from "@/components/admin/AgencySettingsView";
import { requireAdminPage } from "@/lib/server/admin/request";

export const metadata: Metadata = { title: "Agency settings" };

export default async function AgencySettingsPage() {
  await requireAdminPage();
  return <AgencySettingsView />;
}
