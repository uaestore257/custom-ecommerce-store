import { headers } from "next/headers";
import { isConfiguredAdminHost } from "@/lib/auth/constants";
import { StorefrontShell } from "@/components/storefront/StorefrontShell";

// Every public storefront page shares the same header, footer and the
// selected client store's branding.
export default async function StorefrontLayout({ children }: LayoutProps<"/">) {
  const requestHeaders = await headers();
  const isAdminHost = isConfiguredAdminHost(
    requestHeaders.get("host") ?? "",
    process.env.ADMIN_HOST ?? "",
  );

  return <StorefrontShell isAdminHost={isAdminHost}>{children}</StorefrontShell>;
}
