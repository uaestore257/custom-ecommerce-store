import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { SfLinkButton } from "@/components/storefront/primitives";
import { leftToRightValueDir, storefrontMessages } from "@/lib/storefront-i18n";
import type { StorefrontContext } from "@/lib/storefront-types";
import { categoryPath } from "@/lib/storefront-urls";

/** Shared About page (server-rendered; styled by the active template's tokens). */
export function AboutView({ store, categories }: StorefrontContext) {
  const paragraphs = store.aboutText.split(/\n+/).filter(Boolean);
  const listed = categories.filter((category) => category.slug && category.productCount > 0);
  const m = storefrontMessages(store);
  const t = m.about;
  const ltr = leftToRightValueDir(store);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-12 md:py-16">
      <div className="grid gap-10 md:grid-cols-[3fr_2fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">{t.eyebrow}</p>
          <h1 className="mt-2 font-heading text-2xl font-bold tracking-tight sm:text-4xl">{store.name}</h1>
          {store.tagline && <p className="mt-2 text-lg text-muted-foreground">{store.tagline}</p>}
          <div className="mt-6 space-y-4 leading-relaxed text-foreground/85">
            {paragraphs.length > 0 ? paragraphs.map((paragraph, i) => <p key={i}>{paragraph}</p>) : null}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <SfLinkButton href="/shop">{t.browseShop}</SfLinkButton>
            <SfLinkButton href="/contact" variant="secondary">{t.contactUs}</SfLinkButton>
          </div>
        </div>

        <aside className="space-y-4">
          {listed.length > 0 && (
            <nav aria-label={t.collections} className="rounded-card border border-border bg-surface p-4 text-sm sm:p-6">
              <h2 className="font-heading text-base font-semibold">{t.collections}</h2>
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
            <h2 className="font-heading text-base font-semibold">{t.reachUs}</h2>
            <ul className="mt-4 space-y-3 text-muted-foreground">
              {store.contactAddress && (
                <li className="flex gap-3"><MapPin className="h-4 w-4 shrink-0 text-accent" aria-hidden />{store.contactAddress}</li>
              )}
              {store.contactPhone && (
                <li className="flex gap-3"><Phone className="h-4 w-4 shrink-0 text-accent" aria-hidden />{ltr ? <span dir={ltr}>{store.contactPhone}</span> : store.contactPhone}</li>
              )}
              {store.contactEmail && (
                <li className="flex gap-3"><Mail className="h-4 w-4 shrink-0 text-accent" aria-hidden />{store.contactEmail}</li>
              )}
              {!store.contactAddress && !store.contactPhone && !store.contactEmail && (
                <li>{m.noContactDetails}</li>
              )}
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
