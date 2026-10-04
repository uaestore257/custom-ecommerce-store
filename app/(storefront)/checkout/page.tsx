import type { Metadata } from "next";
import { CheckoutView } from "@/components/storefront/CheckoutView";
import { requireStorefrontPage } from "@/lib/server/storefront/page";

export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };

/** One shared checkout for every template (styled by the template's tokens). */
export default async function CheckoutPage() {
  await requireStorefrontPage();
  return <CheckoutView />;
}
