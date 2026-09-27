import type { Metadata } from "next";
import { NewStoreView } from "@/components/admin/NewStoreView";
import { getReferenceOptions } from "@/lib/server/admin/reference";
import { requireAdminPage } from "@/lib/server/admin/request";

export const metadata: Metadata = { title: "Create store" };

export default async function NewStorePage() {
  const reference = await getReferenceOptions((await requireAdminPage()).db);
  return <NewStoreView reference={reference} />;
}
