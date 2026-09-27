import { notFound } from "next/navigation";
import { StoreContextLayout } from "@/components/admin/StoreContext";
import { adminDb } from "@/lib/server/admin/request";
import { getAdminStore } from "@/lib/server/admin/stores";

// Every page below /admin/stores/[storeId] works on this one store,
// loaded from the database by its id. Missing or archived -> 404.
export default async function StoreLayout({ children, params }: LayoutProps<"/admin/stores/[storeId]">) {
  const { storeId } = await params;
  const store = await getAdminStore(await adminDb(), storeId);
  if (!store) notFound();
  return <StoreContextLayout store={store}>{children}</StoreContextLayout>;
}
