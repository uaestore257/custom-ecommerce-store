import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { SfLinkButton } from "@/components/storefront/primitives";
import type { StorefrontContext } from "@/lib/storefront-types";
import { categoryPath } from "@/lib/storefront-urls";

/** Shared About page (server-rendered; styled by the active template's tokens). */
export function AboutView({ store, categories }: StorefrontContext) {
  const paragraphs = store.aboutText.split(/\n+/).filter(Boolean);
  const listed = categories.filter((category) => category.slug && category.productCount > 0);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-12 md:py-16">
      <div className="grid gap-10 md:grid-cols-[3fr_2fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">About us</p>
          <h1 className="mt-2 font-heading text-2xl font-bold tracking-tight sm:text-4xl">{store.name}</h1>
          {store.tagline && <p className="mt-2 text-lg text-muted-foreground">{store.tagline}</p>}
          <div className="mt-6 space-y-4 leading-relaxed text-foreground/85">
            {paragraphs.length > 0 ? paragraphs.map((paragraph, i) => <p key={i}>{paragraph}</p>) : null}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <SfLinkButton href="/shop">Browse the shop</SfLinkButton>
            <SfLinkButton href="/contact" variant="secondary">Contact us</SfLinkButton>
          </div>
        </div>

        <aside className="space-y-4">
          {listed.length > 0 && (
            <nav aria-label="Collections" className="rounded-card border border-border bg-surface p-4 text-sm sm:p-6">
              <h2 className="font-heading text-base font-semibold">Collections</h2>
              <ul className="mt-3 space-y-2">
                {listed.map((category) => (
                  <li key={category.id} className="flex justify-between gap-3">
                    <Link href={categoryPath(category)} className="hover:text-accent hover:underline">{category.name}</Link>
                    <span className="text-muted-foreground tabular-nums">{category.productCount}</span>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          <div className="rounded-card border border-border bg-surface p-4 text-sm sm:p-6">
            <h2 className="font-heading text-base font-semibold">Visit or reach us</h2>
            <ul className="mt-4 space-y-3 text-muted-foreground">
              {store.contactAddress && (
                <li className="flex gap-3"><MapPin className="h-4 w-4 shrink-0 text-accent" aria-hidden />{store.contactAddress}</li>
              )}
              {store.contactPhone && (
                <li className="flex gap-3"><Phone className="h-4 w-4 shrink-0 text-accent" aria-hidden />{store.contactPhone}</li>
              )}
              {store.contactEmail && (
                <li className="flex gap-3"><Mail className="h-4 w-4 shrink-0 text-accent" aria-hidden />{store.contactEmail}</li>
              )}
              {!store.contactAddress && !store.contactPhone && !store.contactEmail && (
                <li>Contact details have not been added yet.</li>
              )}
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
