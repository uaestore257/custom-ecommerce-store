import type { Metadata } from "next";
import { ContactView } from "@/components/storefront/ContactView";
import { BusinessContactPage } from "@/components/platform/BusinessSite";
import { headers } from "next/headers";
import { isPlatformBusinessHost } from "@/lib/store-host";

export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage() {
  if (isPlatformBusinessHost((await headers()).get("host") ?? "")) {
    return <BusinessContactPage />;
  }
  return <ContactView />;
}
