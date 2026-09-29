import type { Metadata } from "next";
import { PolicyView } from "@/components/storefront/PolicyView";

export const metadata: Metadata = { title: "Returns and refunds" };

// Placeholder until the store provides its own text (lib/policies.ts).
export default function ReturnsPage() {
  return <PolicyView policyId="returns" />;
}
