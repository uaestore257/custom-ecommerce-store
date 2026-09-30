import { notFound } from "next/navigation";
import { StoreContextLayout } from "@/components/admin/StoreContext";
import { requireStorePage } from "@/lib/server/admin/request";
import { getAdminStore } from "@/lib/server/admin/stores";

// Every page below /admin/stores/[storeId] works on this one store,
// loaded from the database by its id, for the platform owner or this
// store's owner (requireStorePage). Missing or archived -> 404. A
// suspended store's owner gets it read-only.
export default async function StoreLayout({ children, params }: LayoutProps<"/admin/stores/[storeId]">) {
  const { storeId } = await params;
  const { db, grant } = await requireStorePage(storeId);
  const store = await getAdminStore(db, storeId);
  if (!store) notFound();
  return (
    <StoreContextLayout
      store={store}
      readOnly={grant.access === "read"}
      platform={grant.user.isPlatformOwner}
      role={grant.role}
    >
      {children}
    </StoreContextLayout>
  );
}
