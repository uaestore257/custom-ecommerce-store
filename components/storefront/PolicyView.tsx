import { SfNotice } from "@/components/storefront/primitives";
import { findPolicy, PLACEHOLDER_NOTICE, policyText, type PolicyId } from "@/lib/policies";
import type { StorefrontStore } from "@/lib/storefront-types";

/** A store policy page (shared by every template). Until the store provides its own text, a clearly marked placeholder. */
export function PolicyView({ policyId, store }: { policyId: PolicyId; store: StorefrontStore }) {
  const policy = findPolicy(policyId);
  const contact = [store.contactEmail, store.contactPhone].filter(Boolean).join(" · ");

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">{policy.title}</h1>
      <SfNotice className="mt-6">{policyText(PLACEHOLDER_NOTICE, store.name)}</SfNotice>
      <div className="mt-6 space-y-4 leading-relaxed text-foreground/85">
        {policy.sections.map((text, i) => (
          <p key={i}>{policyText(text, store.name)}</p>
        ))}
        {contact && <p>Questions? Contact {store.name}: {contact}</p>}
      </div>
    </main>
  );
}
