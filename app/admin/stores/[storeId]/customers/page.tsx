import type { Metadata } from "next";
import { CustomersView } from "@/components/admin/CustomersView";
import { DemoStoreData } from "@/components/admin/StoreContext";
import { requireAdminPage } from "@/lib/server/admin/request";

export const metadata: Metadata = { title: "Customers" };

// Customers still use browser demo data (not connected to the database yet).
export default async function CustomersPage() {
  await requireAdminPage();
  return (
    <DemoStoreData area="customers">
      <CustomersView />
    </DemoStoreData>
  );
}
