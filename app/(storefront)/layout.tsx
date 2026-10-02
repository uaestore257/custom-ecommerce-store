import type { Metadata } from "next";
import { headers } from "next/headers";
import { isConfiguredAdminHost } from "@/lib/auth/constants";
import { StorefrontShell } from "@/components/storefront/StorefrontShell";
import { BusinessSiteShell } from "@/components/platform/BusinessSite";
import { getRequestStorefront } from "@/lib/server/storefront/catalog";
import { getPublicStorefrontSeoContext } from "@/lib/server/storefront/seo";
import { isPlatformBusinessHost } from "@/lib/store-host";

export async function generateMetadata(): Promise<Metadata> {
  const context = await getPublicStorefrontSeoContext();
  if (!context) return { robots: { index: false, follow: false } };
  const description = context.store.tagline || context.store.heroText || `${context.store.name} online store.`;
  return {
    metadataBase: context.origin,
    title: { default: context.store.name, template: `%s | ${context.store.name}` },
    description,
  };
}

// Every public storefront page shares the same header, footer and the
// shown store's branding, all read from the database for the ACTIVE store
// this hostname serves (see lib/server/storefront/catalog.ts).
export default async function StorefrontLayout({ children }: LayoutProps<"/">) {
  const requestHeaders = await headers();
  const isAdminHost = isConfiguredAdminHost(
    requestHeaders.get("host") ?? "",
    process.env.ADMIN_HOST ?? "",
  );
  const isBusinessHost = isPlatformBusinessHost(requestHeaders.get("host") ?? "");
  if (isBusinessHost) return <BusinessSiteShell>{children}</BusinessSiteShell>;
  const { catalog } = await getRequestStorefront();

  return (
    <StorefrontShell isAdminHost={isAdminHost} catalog={catalog}>
      {children}
    </StorefrontShell>
  );
}
