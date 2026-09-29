"use client";

import { Notice } from "@/components/ui";
import { findPolicy, PLACEHOLDER_NOTICE, policyText, type PolicyId } from "@/lib/policies";
import { useStorefront } from "@/lib/storefront";

/** A store policy page. Until the store provides its own text, a clearly marked placeholder. */
export function PolicyView({ policyId }: { policyId: PolicyId }) {
  const view = useStorefront();
  if (!view) return null;
  const policy = findPolicy(policyId);
  const { store } = view;
  const contact = [store.contactEmail, store.contactPhone].filter(Boolean).join(" · ");

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{policy.title}</h1>
      <Notice className="mt-6">{policyText(PLACEHOLDER_NOTICE, store.name)}</Notice>
      <div className="mt-6 space-y-4 leading-relaxed text-slate-700">
        {policy.sections.map((text, i) => (
          <p key={i}>{policyText(text, store.name)}</p>
        ))}
        {contact && <p>Questions? Contact {store.name}: {contact}</p>}
      </div>
    </main>
  );
}
