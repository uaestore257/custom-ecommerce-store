import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StoreOverviewView } from "@/components/admin/StoreOverviewView";
import { countActiveProducts } from "@/lib/server/admin/products";
import { requireStorePage } from "@/lib/server/admin/request";
import { getAdminStoreDetail } from "@/lib/server/admin/stores";
import { storefrontPreviewUrlForSlug, storeHostConfig } from "@/lib/store-host";

export const metadata: Metadata = { title: "Store overview" };

export default async function StoreOverviewPage({ params, searchParams }: PageProps<"/admin/stores/[storeId]">) {
  const [{ storeId }, { created }] = await Promise.all([params, searchParams]);
  const { db: client, grant } = await requireStorePage(storeId, "overview");
  const [store, activeProducts] = await Promise.all([
    getAdminStoreDetail(client, storeId),
    countActiveProducts(client, storeId),
  ]);
  if (!store) notFound();
  const config = storeHostConfig();
  const baseUrl = process.env.BETTER_AUTH_URL ?? "";
  const primaryDomain = await client.storeDomain.findFirst({
    where: { storeId, status: "VERIFIED", isPrimary: true },
    select: { hostname: true },
  });
  const previewUrl = storefrontPreviewUrlForSlug(store.slug, baseUrl, config, primaryDomain?.hostname);
  return (
    <StoreOverviewView
      store={store}
      previewUrl={previewUrl}
      activeProducts={activeProducts}
      justCreated={created === "1"}
      platform={grant.user.isPlatformOwner}
      role={grant.role}
    />
  );
}
