import type { Metadata } from "next";
import { CustomersView } from "@/components/admin/CustomersView";

export const metadata: Metadata = { title: "Customers" };

export default function CustomersPage() {
  return <CustomersView />;
}
