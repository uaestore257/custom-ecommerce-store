import type { Metadata } from "next";
import { PolicyView } from "@/components/storefront/PolicyView";
import { requireStorefrontPage } from "@/lib/server/storefront/page";
import { storefrontPageMetadata } from "@/lib/server/storefront/seo";

export async function generateMetadata(): Promise<Metadata> {
  return storefrontPageMetadata({
    title: "Returns and refunds",
    description: "Returns and refunds information for this store.",
    path: "/returns",
  });
}

// Placeholder until the store provides its own text (lib/policies.ts).
export default async function ReturnsPage() {
  const { context } = await requireStorefrontPage();
  return <PolicyView policyId="returns" store={context.store} />;
}
