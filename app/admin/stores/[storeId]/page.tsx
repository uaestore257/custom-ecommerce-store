import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StoreOverviewView } from "@/components/admin/StoreOverviewView";
import { countActiveProducts } from "@/lib/server/admin/products";
import { requireStorePage } from "@/lib/server/admin/request";
import { getAdminStoreDetail } from "@/lib/server/admin/stores";

export const metadata: Metadata = { title: "Store overview" };

export default async function StoreOverviewPage({ params, searchParams }: PageProps<"/admin/stores/[storeId]">) {
  const [{ storeId }, { created }] = await Promise.all([params, searchParams]);
  const { db: client, grant } = await requireStorePage(storeId, "overview");
  const [store, activeProducts] = await Promise.all([
    getAdminStoreDetail(client, storeId),
    countActiveProducts(client, storeId),
  ]);
  if (!store) notFound();
  return (
    <StoreOverviewView
      store={store}
      activeProducts={activeProducts}
      justCreated={created === "1"}
      platform={grant.user.isPlatformOwner}
      role={grant.role}
    />
  );
}
