import type { Metadata } from "next";
import { AgencySettingsView } from "@/components/admin/AgencySettingsView";

export const metadata: Metadata = { title: "Agency settings" };

export default function AgencySettingsPage() {
  return <AgencySettingsView />;
}
