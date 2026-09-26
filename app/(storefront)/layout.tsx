import { StorefrontShell } from "@/components/storefront/StorefrontShell";

// Every public storefront page shares the same header, footer and the
// selected client store's branding.
export default function StorefrontLayout({ children }: LayoutProps<"/">) {
  return <StorefrontShell>{children}</StorefrontShell>;
}
