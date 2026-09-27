import { Store as StoreIcon } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { LinkButton } from "@/components/ui";

// Shown inside the admin layout for a missing or archived store/product.
export default function AdminNotFound() {
  return (
    <EmptyState
      icon={StoreIcon}
      title="Not found"
      description="This store or product does not exist, or the store has been archived."
      action={<LinkButton href="/admin/stores">Back to client stores</LinkButton>}
    />
  );
}
