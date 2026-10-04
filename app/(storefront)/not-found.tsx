import { headers } from "next/headers";
import { PackageX } from "lucide-react";
import { SfEmptyState, SfLinkButton } from "@/components/storefront/primitives";
import { getRequestStorefront } from "@/lib/server/storefront/catalog";
import { messagesFor, storefrontMessages } from "@/lib/storefront-i18n";
import { isPlatformBusinessHost, isStorefrontPathPreviewHost } from "@/lib/store-host";

// Shown inside the store's template when a storefront page calls
// notFound(), e.g. a product that is missing, a draft, or another store's.
export default async function StorefrontNotFound() {
  // In the shown store's interface language; the platform's own site stays English (as its layout does).
  const host = (await headers()).get("host") ?? "";
  const context = isPlatformBusinessHost(host) && !isStorefrontPathPreviewHost(host) ? null : await getRequestStorefront();
  const t = (context ? storefrontMessages(context.store) : messagesFor("en")).notFound;
  return (
    <main className="mx-auto max-w-xl px-4 py-20 sm:px-6">
      <SfEmptyState
        icon={PackageX}
        title={t.title}
        description={t.description}
        action={<SfLinkButton href="/shop">{t.backToShop}</SfLinkButton>}
      />
    </main>
  );
}
