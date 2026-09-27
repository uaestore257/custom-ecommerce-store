import type { Metadata } from "next";
import { CustomersView } from "@/components/admin/CustomersView";
import { DemoStoreData } from "@/components/admin/StoreContext";

export const metadata: Metadata = { title: "Customers" };

// Customers still use browser demo data (not connected to the database yet).
export default function CustomersPage() {
  return (
    <DemoStoreData area="customers">
      <CustomersView />
    </DemoStoreData>
  );
}
