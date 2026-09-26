"use client";

import { Mail, MapPin, Phone } from "lucide-react";
import { LinkButton } from "@/components/ui";
import { useStorefront } from "@/lib/storefront";

export function AboutView() {
  const view = useStorefront();
  if (!view) return null;
  const { store, data, products } = view;
  const { settings } = store;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-12 md:py-16">
      <div className="grid gap-10 md:grid-cols-[3fr_2fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">About us</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-4xl">{store.name}</h1>
          <p className="mt-2 text-lg text-slate-600">{settings.tagline}</p>
          <div className="mt-6 space-y-4 leading-relaxed text-slate-700">
            {settings.aboutText
              .split(/\n+/)
              .filter(Boolean)
              .map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton href="/shop" tone="brand">Browse the shop</LinkButton>
            <LinkButton href="/contact" variant="secondary">Contact us</LinkButton>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Stat label="Products" value={products.length} />
            <Stat label="Categories" value={data.categories.length} />
          </div>
          <div className="rounded-2xl border border-slate-200 p-4 text-sm sm:p-6">
            <h2 className="text-base font-semibold">Visit or reach us</h2>
            <ul className="mt-4 space-y-3 text-slate-600">
              {settings.contactAddress && (
                <li className="flex gap-3"><MapPin className="h-4 w-4 shrink-0 text-brand" aria-hidden />{settings.contactAddress}</li>
              )}
              {settings.contactPhone && (
                <li className="flex gap-3"><Phone className="h-4 w-4 shrink-0 text-brand" aria-hidden />{settings.contactPhone}</li>
              )}
              {settings.contactEmail && (
                <li className="flex gap-3"><Mail className="h-4 w-4 shrink-0 text-brand" aria-hidden />{settings.contactEmail}</li>
              )}
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-brand/10 p-5">
      <p className="text-3xl font-bold text-brand">{value}</p>
      <p className="text-sm font-medium text-slate-700">{label}</p>
    </div>
  );
}
