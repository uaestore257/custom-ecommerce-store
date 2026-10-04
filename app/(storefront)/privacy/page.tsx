import type { Metadata } from "next";
import { PolicyView } from "@/components/storefront/PolicyView";
import { requireStorefrontPage } from "@/lib/server/storefront/page";
import { storefrontPageMetadata } from "@/lib/server/storefront/seo";

export async function generateMetadata(): Promise<Metadata> {
  return storefrontPageMetadata({
    title: "Privacy policy",
    description: "Privacy information for this storefront.",
    path: "/privacy",
  });
}

// Placeholder until the store provides its own text (lib/policies.ts).
export default async function PrivacyPage() {
  const { context } = await requireStorefrontPage();
  return <PolicyView policyId="privacy" store={context.store} />;
}
