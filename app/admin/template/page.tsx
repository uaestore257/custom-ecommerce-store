import type { Metadata } from "next";
import { TemplateView } from "@/components/admin/TemplateView";
import { requireAdminPage } from "@/lib/server/admin/request";

export const metadata: Metadata = { title: "Master template" };

export default async function TemplatePage() {
  await requireAdminPage();
  return <TemplateView />;
}
