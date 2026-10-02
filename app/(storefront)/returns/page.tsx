import type { Metadata } from "next";
import { PolicyView } from "@/components/storefront/PolicyView";
import { storefrontPageMetadata } from "@/lib/server/storefront/seo";

export async function generateMetadata(): Promise<Metadata> {
  return storefrontPageMetadata({
    title: "Returns and refunds",
    description: "Returns and refunds information for this store.",
    path: "/returns",
  });
}

// Placeholder until the store provides its own text (lib/policies.ts).
export default function ReturnsPage() {
  return <PolicyView policyId="returns" />;
}
