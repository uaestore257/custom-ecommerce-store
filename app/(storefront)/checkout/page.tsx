import type { Metadata } from "next";
import { CheckoutView } from "@/components/storefront/CheckoutView";

export const metadata: Metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return <CheckoutView />;
}
