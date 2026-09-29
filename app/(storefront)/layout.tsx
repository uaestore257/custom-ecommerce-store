import { headers } from "next/headers";
import { isConfiguredAdminHost } from "@/lib/auth/constants";
import { StorefrontShell } from "@/components/storefront/StorefrontShell";
import { getRequestStorefront } from "@/lib/server/storefront/catalog";

// Every public storefront page shares the same header, footer and the
// shown store's branding, all read from the database for the ACTIVE store
// this hostname serves (see lib/server/storefront/catalog.ts).
export default async function StorefrontLayout({ children }: LayoutProps<"/">) {
  const requestHeaders = await headers();
  const isAdminHost = isConfiguredAdminHost(
    requestHeaders.get("host") ?? "",
    process.env.ADMIN_HOST ?? "",
  );
  const { catalog } = await getRequestStorefront();

  return (
    <StorefrontShell isAdminHost={isAdminHost} catalog={catalog}>
      {children}
    </StorefrontShell>
  );
}
