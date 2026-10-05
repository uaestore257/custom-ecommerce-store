import type { Metadata } from "next";
import { PolicyView } from "@/components/storefront/PolicyView";
import { getRequestStorefrontMessages } from "@/lib/server/storefront/catalog";
import { requireStorefrontPage } from "@/lib/server/storefront/page";
import { storefrontPageMetadata } from "@/lib/server/storefront/seo";

export async function generateMetadata(): Promise<Metadata> {
  const policy = (await getRequestStorefrontMessages()).policies.pages.returns;
  return storefrontPageMetadata({
    title: policy.title,
    description: policy.description,
    path: "/returns",
  });
}

// Placeholder until the store provides its own text (lib/policies.ts).
export default async function ReturnsPage() {
  const { context } = await requireStorefrontPage();
  return <PolicyView policyId="returns" store={context.store} />;
}
