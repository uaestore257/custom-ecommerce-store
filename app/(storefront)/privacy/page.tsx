import type { Metadata } from "next";
import { PolicyView } from "@/components/storefront/PolicyView";

export const metadata: Metadata = { title: "Privacy policy" };

// Placeholder until the store provides its own text (lib/policies.ts).
export default function PrivacyPage() {
  return <PolicyView policyId="privacy" />;
}
