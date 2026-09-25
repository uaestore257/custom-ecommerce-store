import type { Metadata } from "next";
import { StoreSettingsView } from "@/components/admin/StoreSettingsView";

export const metadata: Metadata = { title: "Store settings" };

export default function StoreSettingsPage() {
  return <StoreSettingsView />;
}
