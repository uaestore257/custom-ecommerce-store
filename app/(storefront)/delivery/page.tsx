import type { Metadata } from "next";
import { PolicyView } from "@/components/storefront/PolicyView";
import { storefrontPageMetadata } from "@/lib/server/storefront/seo";

export async function generateMetadata(): Promise<Metadata> {
  return storefrontPageMetadata({
    title: "Delivery information",
    description: "Delivery and collection information for this store.",
    path: "/delivery",
  });
}

// Placeholder until the store provides its own text (lib/policies.ts).
export default function DeliveryPage() {
  return <PolicyView policyId="delivery" />;
}
