import type { Metadata } from "next";
import { CartView } from "@/components/storefront/CartView";

export const metadata: Metadata = { title: "Cart", robots: { index: false, follow: false } };

export default function CartPage() {
  return <CartView />;
}
