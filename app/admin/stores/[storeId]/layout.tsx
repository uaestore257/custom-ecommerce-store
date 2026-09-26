import { StoreContextLayout } from "@/components/admin/StoreContext";

// Every page below /admin/stores/[storeId] works on this one store only.
export default async function StoreLayout({ children, params }: LayoutProps<"/admin/stores/[storeId]">) {
  const { storeId } = await params;
  return <StoreContextLayout storeId={storeId}>{children}</StoreContextLayout>;
}
