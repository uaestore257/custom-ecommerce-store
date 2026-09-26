import type { Metadata } from "next";
import { NewStoreView } from "@/components/admin/NewStoreView";

export const metadata: Metadata = { title: "Create store" };

export default function NewStorePage() {
  return <NewStoreView />;
}
