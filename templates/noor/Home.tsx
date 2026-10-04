import Link from "next/link";
import type { CSSProperties } from "react";
import { CategoryImage } from "@/components/CategoryImage";
import { ProductImage } from "@/components/ProductImage";
import { messagesFor, storefrontUiLocale } from "@/lib/storefront-i18n";
import { categoryPath } from "@/lib/storefront-urls";
import type { TemplateHomeProps } from "../types";
import { noorNoteFont } from "./fonts";
import { noorMessages } from "./messages";
import { NoorOrnament } from "./Ornament";
import { NOOR_GRID, NoorProductCard } from "./ProductCard";
import { NOOR_CONTAINER, noorArch, noorArchFrame, noorButton, noorEyebrow, noorLink, noorOutlineButton, noorTitle } from "./styles";

/**
 * Commerce-first and symmetrical: an arcade hero (a tall central arch
 * flanked by two smaller ones on large screens) under a centred headline,
 * arched collections, featured pieces, the store's own note set in an
 * arched panel, products by collection (P5 shelves), and a closing call.
 * Images come only from the store's products and categories; with none,
 * the arches stay as quiet empty frames.
 */
export function NoorHome({ store, categories, featured, shelves }: TemplateHomeProps) {
  const locale = storefrontUiLocale(store);
  const t = noorMessages(locale);
  const shared = messagesFor(locale);
  const collections = categories.filter((category) => category.slug && category.productCount > 0);
  const pictures = [
    ...featured.filter((product) => product.imageUrl).map((product) => product.imageUrl),
    ...collections.filter((category) => category.imageUrl).map((category) => category.imageUrl),
  ];
  const [center = "", left = "", right = ""] = pictures;
  const note = store.aboutText.split(/\n+/).find(Boolean) ?? "";

  return (
    <main>
      <section aria-labelledby="noor-hero" className="overflow-hidden">
        <div className={`${NOOR_CONTAINER} pt-12 text-center sm:pt-16 lg:pt-20`}>
          {store.tagline && <p className={noorEyebrow}>{store.tagline}</p>}
          <h1 id="noor-hero" className="mx-auto mt-5 max-w-3xl text-balance font-heading text-4xl leading-[1.15] sm:text-5xl lg:text-6xl">
            {store.heroTitle || store.name}
          </h1>
          {store.heroText && <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">{store.heroText}</p>}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/shop" className={noorButton}>{t.shopTheCollection}</Link>
            <Link href="/about" className={noorOutlineButton}>{t.ourStory}</Link>
          </div>
        </div>
        <div className={`${NOOR_CONTAINER} mt-12 grid grid-cols-[1fr_minmax(0,22rem)_1fr] items-end gap-4 sm:gap-6 lg:mt-16 lg:gap-10`} aria-hidden>
          {/* Flanking arches are smaller and lean in toward the centre (inline end / start, so it mirrors). */}
          <ArchWindow src={left} className="hidden w-full max-w-[15rem] translate-y-6 justify-self-end opacity-90 sm:block" delay="150ms" />
          <ArchWindow src={center} priority className="w-full" delay="0ms" />
          <ArchWindow src={right} className="hidden w-full max-w-[15rem] translate-y-6 justify-self-start opacity-90 sm:block" delay="300ms" />
        </div>
        <div className="border-b border-border" />
      </section>

      {collections.length > 0 && (
        <section aria-labelledby="noor-collections" className="py-16 lg:py-24">
          <div className={`${NOOR_CONTAINER} text-center`}>
            <h2 id="noor-collections" className={noorTitle}>{t.collections}</h2>
            <NoorOrnament className="mt-5" />
          </div>
          <ul className={`${NOOR_CONTAINER} mt-10 flex snap-x snap-mandatory scroll-px-5 gap-5 overflow-x-auto pb-2 [scrollbar-width:none] sm:scroll-px-8 md:flex-wrap md:justify-center md:overflow-visible lg:scroll-px-12`}>
            {collections.map((category) => (
              <li key={category.id} className="w-[42%] shrink-0 snap-start text-center sm:w-48 lg:w-52">
                <Link href={categoryPath(category)} className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-4 focus-visible:ring-offset-background">
                  <span className={`block ${noorArchFrame} transition-colors duration-500 group-hover:border-foreground/40`}>
                    <span className={`block ${noorArch}`}>
                      <CategoryImage src={category.imageUrl} alt="" className="aspect-[3/4] w-full transition duration-700 group-hover:scale-[1.03] motion-reduce:transition-none" />
                    </span>
                  </span>
                  <span className="mt-4 block font-heading text-xl group-hover:text-accent">{category.name}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{shared.items(category.productCount)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {featured.length > 0 && (
        <section aria-labelledby="noor-featured" className="border-t border-border bg-surface py-16 lg:py-24">
          <div className={NOOR_CONTAINER}>
            <div className="text-center">
              <h2 id="noor-featured" className={noorTitle}>{t.featured}</h2>
              <NoorOrnament className="mt-5" />
            </div>
            <ul className={`mt-12 ${NOOR_GRID}`}>
              {featured.map((product) => (
                <li key={product.id} className="min-w-0">
                  <NoorProductCard product={product} store={store} t={t} />
                </li>
              ))}
            </ul>
            <p className="mt-12 text-center">
              <Link href="/shop" className={`text-sm ${noorLink}`}>{t.viewAll}</Link>
            </p>
          </div>
        </section>
      )}

      {note && (
        <section aria-labelledby="noor-note" className="py-16 lg:py-24">
          <div className={`${NOOR_CONTAINER}`}>
            <div className="mx-auto max-w-3xl rounded-t-[12rem] border border-border px-6 pb-14 pt-20 text-center sm:px-16 sm:pt-24">
              <h2 id="noor-note" className={noorEyebrow}>{t.aboutStore(store.name)}</h2>
              <p className="mt-6 text-balance text-2xl leading-relaxed sm:text-3xl" style={{ fontFamily: noorNoteFont }}>{note}</p>
              <Link href="/about" className={`mt-8 inline-block text-sm ${noorLink}`}>{t.ourStory}</Link>
            </div>
          </div>
        </section>
      )}

      {shelves.length > 0 && (
        <section aria-labelledby="noor-discover" className="border-t border-border py-16 lg:py-24">
          <div className={NOOR_CONTAINER}>
            <div className="text-center">
              <h2 id="noor-discover" className={noorTitle}>{t.discover}</h2>
              <NoorOrnament className="mt-5" />
            </div>
            {shelves.map(({ category, products }) => (
              <div key={category.id} data-shelf={category.id} className="mt-14">
                <div className="flex items-baseline justify-between gap-4 border-b border-border pb-3">
                  <h3 className="font-heading text-2xl">{category.name}</h3>
                  <Link href={categoryPath(category)} className={`shrink-0 text-sm ${noorLink}`}>{t.viewAll}</Link>
                </div>
                <ul className={`mt-8 ${NOOR_GRID}`}>
                  {products.map((product) => (
                    <li key={product.id} className="min-w-0">
                      <NoorProductCard product={product} store={store} t={t} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="noor-closing" className="border-t border-border bg-surface py-16 lg:py-24">
        <div className={`${NOOR_CONTAINER} text-center`}>
          <NoorOrnament />
          <h2 id="noor-closing" className={`mt-6 ${noorTitle}`}>{t.closingTitle}</h2>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">{t.closingText}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/shop" className={noorButton}>{t.shopTheCollection}</Link>
            <Link href="/contact" className={noorOutlineButton}>{t.contactUs}</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

/** One arched window of the hero arcade; an empty frame when there is no image. */
function ArchWindow({ src, priority = false, className = "", delay }: { src: string; priority?: boolean; className?: string; delay: string }) {
  return (
    <div className={`${noorArchFrame} transition duration-1000 ease-out starting:translate-y-8 starting:opacity-0 motion-reduce:transition-none ${className}`} style={{ transitionDelay: delay } as CSSProperties}>
      <div className={noorArch}>
        {src ? (
          <ProductImage src={src} alt="" priority={priority} className="aspect-[3/4] w-full" />
        ) : (
          <div className="aspect-[3/4] w-full bg-[radial-gradient(circle_at_50%_32%,color-mix(in_srgb,var(--sf-accent)_14%,transparent),transparent_60%)]" />
        )}
      </div>
    </div>
  );
}
