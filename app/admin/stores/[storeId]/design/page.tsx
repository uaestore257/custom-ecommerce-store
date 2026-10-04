import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StoreDesignView, type DesignTemplateOption } from "@/components/admin/StoreDesignView";
import { getAdminStoreDesign, listTemplateDemoStores } from "@/lib/server/admin/design";
import { requireStorePage } from "@/lib/server/admin/request";
import { storefrontPreviewUrlForSlug, storeHostConfig } from "@/lib/store-host";
import { getTemplateDefinition, TEMPLATE_KEYS } from "@/lib/templates/registry";

export const metadata: Metadata = { title: "Design" };

// The store's template and its options. OWNER and the platform owner only
// (requireStorePage "design" section; the action re-checks on save).
export default async function StoreDesignPage({ params }: PageProps<"/admin/stores/[storeId]/design">) {
  const { storeId } = await params;
  const { db, grant } = await requireStorePage(storeId, "design");
  const [design, demos, store] = await Promise.all([
    getAdminStoreDesign(db, storeId),
    listTemplateDemoStores(db),
    db.store.findFirst({
      where: { id: storeId, archivedAt: null },
      select: {
        slug: true,
        status: true,
        domains: { where: { status: "VERIFIED", isPrimary: true }, select: { hostname: true }, take: 1 },
      },
    }),
  ]);
  if (!design || !store) notFound();

  const config = storeHostConfig();
  const baseUrl = process.env.BETTER_AUTH_URL ?? "";
  const templates: DesignTemplateOption[] = TEMPLATE_KEYS.map((key) => {
    const { manifest, theme } = getTemplateDefinition(key);
    return {
      key,
      manifest,
      options: Object.entries(theme.options).map(([option, spec]) => ({ key: option, ...spec, choices: [...spec.choices] })),
      demos: (demos[key] ?? [])
        .filter((demo) => demo.id !== storeId)
        .map((demo) => ({ name: demo.name, url: storefrontPreviewUrlForSlug(demo.slug, baseUrl, config) }))
        .filter((demo): demo is { name: string; url: string } => demo.url !== null),
    };
  });
  const storefrontUrl =
    store.status === "ACTIVE" ? storefrontPreviewUrlForSlug(store.slug, baseUrl, config, store.domains[0]?.hostname) : null;

  return (
    <StoreDesignView
      storeId={storeId}
      design={design}
      templates={templates}
      storefrontUrl={storefrontUrl}
      readOnly={grant.access !== "write"}
      platform={grant.user.isPlatformOwner}
    />
  );
}
