import type { Metadata } from "next";
import { StoresListView } from "@/components/admin/StoresListView";

export const metadata: Metadata = { title: "Client stores" };

export default function StoresPage() {
  return <StoresListView />;
}
