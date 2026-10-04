import type { Metadata } from "next";
import { requireStorefrontPage } from "@/lib/server/storefront/page";

export const metadata: Metadata = { title: "Cart", robots: { index: false, follow: false } };

/** The template's cart presentation over the shared cart hook. */
export default async function CartPage() {
  const { context, template } = await requireStorefrontPage();
  const { Cart } = template;
  return <Cart {...context} />;
}
