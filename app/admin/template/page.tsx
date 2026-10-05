import type { Metadata } from "next";
import { TemplateView, type TemplateLibraryEntry } from "@/components/admin/TemplateView";
import { countStoresByTemplate, listAdminDemoStores, listTemplateDemoStores } from "@/lib/server/admin/design";
import { requireAdminPage } from "@/lib/server/admin/request";
import { storefrontPreviewUrlForSlug, storeHostConfig } from "@/lib/store-host";
import { getTemplateDefinition, TEMPLATE_KEYS } from "@/lib/templates/registry";

export const metadata: Metadata = { title: "Templates" };

export default async function TemplatePage() {
  const { db } = await requireAdminPage();
  const [counts, demos, demoStores] = await Promise.all([
    countStoresByTemplate(db),
    listTemplateDemoStores(db),
    listAdminDemoStores(db),
  ]);
  const config = storeHostConfig();
  const baseUrl = process.env.BETTER_AUTH_URL ?? "";
  const templates: TemplateLibraryEntry[] = TEMPLATE_KEYS.map((key) => ({
    manifest: getTemplateDefinition(key).manifest,
    storeCount: counts[key],
    demos: (demos[key] ?? [])
      .map((demo) => ({
        id: demo.id,
        name: demo.name,
        slug: demo.slug,
        url: storefrontPreviewUrlForSlug(demo.slug, baseUrl, config),
      })),
  }));
  return <TemplateView templates={templates} demoStores={demoStores} />;
}
