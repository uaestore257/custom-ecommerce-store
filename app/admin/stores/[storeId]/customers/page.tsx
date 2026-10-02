import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CustomersView } from "@/components/admin/CustomersView";
import { listAdminCustomers } from "@/lib/server/admin/customers";
import { requireStorePage } from "@/lib/server/admin/request";
import { getAdminStore } from "@/lib/server/admin/stores";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage({ params }: PageProps<"/admin/stores/[storeId]/customers">) {
  const { storeId } = await params;
  const { db, grant } = await requireStorePage(storeId, "customers");
  const [store, customers] = await Promise.all([
    getAdminStore(db, storeId),
    listAdminCustomers(db, storeId),
  ]);
  if (!store || !customers) notFound();
  return (
    <CustomersView
      storeName={store.name}
      storeId={store.id}
      customers={customers.customers}
      hasMore={customers.hasMore}
      platform={grant.user.isPlatformOwner}
    />
  );
}
