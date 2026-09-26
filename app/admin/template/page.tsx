import type { Metadata } from "next";
import { TemplateView } from "@/components/admin/TemplateView";

export const metadata: Metadata = { title: "Master template" };

export default function TemplatePage() {
  return <TemplateView />;
}
