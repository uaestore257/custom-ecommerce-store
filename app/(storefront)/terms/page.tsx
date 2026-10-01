import type { Metadata } from "next";
import { PolicyView } from "@/components/storefront/PolicyView";
import { storefrontPageMetadata } from "@/lib/server/storefront/seo";

export async function generateMetadata(): Promise<Metadata> {
  return storefrontPageMetadata({
    title: "Terms and conditions",
    description: "Terms and conditions for using this storefront.",
    path: "/terms",
  });
}

// Placeholder until the store provides its own text (lib/policies.ts).
export default function TermsPage() {
  return <PolicyView policyId="terms" />;
}
