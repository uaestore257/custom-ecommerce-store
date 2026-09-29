import type { Metadata } from "next";
import { PolicyView } from "@/components/storefront/PolicyView";

export const metadata: Metadata = { title: "Terms and conditions" };

// Placeholder until the store provides its own text (lib/policies.ts).
export default function TermsPage() {
  return <PolicyView policyId="terms" />;
}
