import type { Metadata } from "next";
import { TemplateView, type TemplateLibraryEntry } from "@/components/admin/TemplateView";
import { countStoresByTemplate, listTemplateDemoStores } from "@/lib/server/admin/design";
import { requireAdminPage } from "@/lib/server/admin/request";
import { storefrontPreviewUrlForSlug, storeHostConfig } from "@/lib/store-host";
import { getTemplateDefinition, TEMPLATE_KEYS } from "@/lib/templates/registry";

export const metadata: Metadata = { title: "Templates" };

export default async function TemplatePage() {
  const { db } = await requireAdminPage();
  const [counts, demos] = await Promise.all([countStoresByTemplate(db), listTemplateDemoStores(db)]);
  const config = storeHostConfig();
  const baseUrl = process.env.BETTER_AUTH_URL ?? "";
  const templates: TemplateLibraryEntry[] = TEMPLATE_KEYS.map((key) => ({
    manifest: getTemplateDefinition(key).manifest,
    storeCount: counts[key],
    demos: (demos[key] ?? [])
      .map((demo) => ({ name: demo.name, url: storefrontPreviewUrlForSlug(demo.slug, baseUrl, config) }))
      .filter((demo): demo is { name: string; url: string } => demo.url !== null),
  }));
  return <TemplateView templates={templates} />;
}
