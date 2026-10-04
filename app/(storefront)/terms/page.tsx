import type { Metadata } from "next";
import { PolicyView } from "@/components/storefront/PolicyView";
import { requireStorefrontPage } from "@/lib/server/storefront/page";
import { storefrontPageMetadata } from "@/lib/server/storefront/seo";

export async function generateMetadata(): Promise<Metadata> {
  return storefrontPageMetadata({
    title: "Terms and conditions",
    description: "Terms and conditions for using this storefront.",
    path: "/terms",
  });
}

// Placeholder until the store provides its own text (lib/policies.ts).
export default async function TermsPage() {
  const { context } = await requireStorefrontPage();
  return <PolicyView policyId="terms" store={context.store} />;
}
