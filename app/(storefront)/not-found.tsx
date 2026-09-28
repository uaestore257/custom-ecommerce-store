import { PackageX } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { LinkButton } from "@/components/ui";

// Shown inside the storefront layout when a storefront page calls
// notFound(), e.g. a product that is missing, a draft, or another store's.
export default function StorefrontNotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-20 sm:px-6">
      <EmptyState
        icon={PackageX}
        title="Not found"
        description="We couldn't find this in the store. It may have been removed, or the link may be wrong."
        action={<LinkButton href="/shop" tone="brand">Back to shop</LinkButton>}
      />
    </main>
  );
}
