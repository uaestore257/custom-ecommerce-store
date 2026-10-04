import { PackageX } from "lucide-react";
import { SfEmptyState, SfLinkButton } from "@/components/storefront/primitives";

// Shown inside the store's template when a storefront page calls
// notFound(), e.g. a product that is missing, a draft, or another store's.
export default function StorefrontNotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-20 sm:px-6">
      <SfEmptyState
        icon={PackageX}
        title="Not found"
        description="We couldn't find this in the store. It may have been removed, or the link may be wrong."
        action={<SfLinkButton href="/shop">Back to shop</SfLinkButton>}
      />
    </main>
  );
}
