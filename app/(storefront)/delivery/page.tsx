import type { Metadata } from "next";
import { PolicyView } from "@/components/storefront/PolicyView";

export const metadata: Metadata = { title: "Delivery information" };

// Placeholder until the store provides its own text (lib/policies.ts).
export default function DeliveryPage() {
  return <PolicyView policyId="delivery" />;
}
