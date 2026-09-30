import type { Metadata } from "next";
import { AccountSettingsForm } from "@/components/admin/AccountSettingsForm";
import { requireAdminViewer } from "@/lib/server/admin/request";

export const metadata: Metadata = { title: "Account settings" };

export default async function AccountSettingsPage() {
  const { viewer } = await requireAdminViewer();
  return <AccountSettingsForm name={viewer.user.name} email={viewer.user.email} />;
}
