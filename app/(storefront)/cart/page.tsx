import type { Metadata } from "next";
import { getRequestStorefrontMessages } from "@/lib/server/storefront/catalog";
import { requireStorefrontPage } from "@/lib/server/storefront/page";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getRequestStorefrontMessages()).meta.cart, robots: { index: false, follow: false } };
}

/** The template's cart presentation over the shared cart hook. */
export default async function CartPage() {
  const { context, template } = await requireStorefrontPage();
  const { Cart } = template;
  return <Cart {...context} />;
}
