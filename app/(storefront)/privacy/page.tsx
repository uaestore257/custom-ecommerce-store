import type { Metadata } from "next";
import { PolicyView } from "@/components/storefront/PolicyView";
import { getRequestStorefrontMessages } from "@/lib/server/storefront/catalog";
import { requireStorefrontPage } from "@/lib/server/storefront/page";
import { storefrontPageMetadata } from "@/lib/server/storefront/seo";

export async function generateMetadata(): Promise<Metadata> {
  const policy = (await getRequestStorefrontMessages()).policies.pages.privacy;
  return storefrontPageMetadata({
    title: policy.title,
    description: policy.description,
    path: "/privacy",
  });
}

// Placeholder until the store provides its own text (lib/policies.ts).
export default async function PrivacyPage() {
  const { context } = await requireStorefrontPage();
  return <PolicyView policyId="privacy" store={context.store} />;
}
