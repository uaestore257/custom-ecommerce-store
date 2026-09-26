import type { Metadata } from "next";
import { ContactView } from "@/components/storefront/ContactView";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return <ContactView />;
}
