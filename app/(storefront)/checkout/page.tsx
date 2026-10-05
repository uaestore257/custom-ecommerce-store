import type { Metadata } from "next";
import { CheckoutView } from "@/components/storefront/CheckoutView";
import { getRequestStorefrontMessages } from "@/lib/server/storefront/catalog";
import { requireStorefrontPage } from "@/lib/server/storefront/page";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getRequestStorefrontMessages()).meta.checkout, robots: { index: false, follow: false } };
}

/** One shared checkout for every template (styled by the template's tokens). */
export default async function CheckoutPage() {
  await requireStorefrontPage();
  return <CheckoutView />;
}
