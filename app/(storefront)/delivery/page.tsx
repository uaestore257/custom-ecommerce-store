import type { Metadata } from "next";
import { PolicyView } from "@/components/storefront/PolicyView";
import { requireStorefrontPage } from "@/lib/server/storefront/page";
import { storefrontPageMetadata } from "@/lib/server/storefront/seo";

export async function generateMetadata(): Promise<Metadata> {
  return storefrontPageMetadata({
    title: "Delivery information",
    description: "Delivery and collection information for this store.",
    path: "/delivery",
  });
}

// Placeholder until the store provides its own text (lib/policies.ts).
export default async function DeliveryPage() {
  const { context } = await requireStorefrontPage();
  return <PolicyView policyId="delivery" store={context.store} />;
}
