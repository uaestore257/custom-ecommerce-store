import Link from "next/link";
import { CategoryImage } from "@/components/CategoryImage";
import { ProductImage } from "@/components/ProductImage";
import { paymentMethodLabel } from "@/lib/config";
import { categoryPath } from "@/lib/storefront-urls";
import type { TemplateHomeProps } from "../types";
import { MAISON_GRID, MaisonProductCard } from "./ProductCard";
import { MAISON_CAMPAIGN, MAISON_CONTAINER, maisonLabel, maisonLink } from "./styles";

export function MaisonHome({ store, categories, featured }: TemplateHomeProps) {
  const collections = categories.filter((category) => category.slug && category.productCount > 0);
  const campaignImage =
    store.theme.hero === "wordmark"
      ? ""
      : featured.find((product) => product.imageUrl)?.imageUrl || collections.find((category) => category.imageUrl)?.imageUrl || "";
  const story = store.aboutText.split(/\n+/).find(Boolean) ?? "";

  return (
    <main>
      {/* Pulled up beneath the transparent header (h-16 / lg:h-20). */}
      <section aria-labelledby="maison-hero" className={`relative -mt-16 flex min-h-[88svh] flex-col justify-end overflow-hidden lg:-mt-20 lg:min-h-[100svh] ${MAISON_CAMPAIGN}`}>
        {campaignImage ? (
          <>
            <ProductImage src={campaignImage} alt="" priority className="absolute inset-0 h-full w-full" />
            <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(12_11_10/0.55),transparent_28%,transparent_55%,rgb(12_11_10/0.7))]" />
          </>
        ) : (
          <p aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 select-none px-5 text-center font-heading text-[18vw] font-medium uppercase leading-none tracking-[0.04em] opacity-[0.08] rtl:tracking-normal">
            {store.name}
          </p>
        )}
        <div className={`${MAISON_CONTAINER} relative pb-14 pt-32 lg:pb-20`}>
          {store.tagline && <p className={`${maisonLabel} opacity-80`}>{store.tagline}</p>}
          <h1 id="maison-hero" className="mt-5 max-w-4xl text-balance font-heading text-5xl leading-[1.02] sm:text-7xl lg:text-8xl">
            {store.heroTitle || store.name}
          </h1>
          {store.heroText && <p className="mt-6 max-w-lg text-sm leading-relaxed opacity-80 sm:text-base">{store.heroText}</p>}
          <Link href="/shop" className={`mt-10 inline-block ${maisonLabel} ${maisonLink}`}>Discover the collection</Link>
        </div>
      </section>

      {collections.length > 0 && (
        <section aria-labelledby="maison-collections" className="pt-20 lg:pt-28">
          <div className={MAISON_CONTAINER}>
            <h2 id="maison-collections" className={`${maisonLabel} text-muted-foreground`}>The collections</h2>
          </div>
          <ul className={`${MAISON_CONTAINER} mt-8 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto [scrollbar-width:none] sm:scroll-px-8 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible lg:grid-cols-3 lg:scroll-px-12`}>
            {collections.map((category) => (
              <li key={category.id} className="w-[78%] shrink-0 snap-start md:w-auto">
                <Link href={categoryPath(category)} className={`group relative block overflow-hidden focus:outline-none focus-visible:ring-1 focus-visible:ring-focus focus-visible:ring-offset-4 focus-visible:ring-offset-background`}>
                  <CategoryImage src={category.imageUrl} alt="" className="aspect-[2/3] w-full transition duration-700 ease-out group-hover:scale-[1.02] motion-reduce:transition-none" />
                  <span aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top,rgb(12_11_10/0.6),transparent_45%)]" />
                  <span className="absolute inset-x-0 bottom-0 p-6 text-[#f4efe6]">
                    <span className="block font-heading text-3xl uppercase tracking-[0.12em] lg:text-4xl rtl:tracking-normal">{category.name}</span>
                    <span className={`mt-2 block ${maisonLabel} opacity-80`}>Discover</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {featured.length > 0 && (
        <section aria-labelledby="maison-edit" className={`${MAISON_CONTAINER} py-20 lg:py-28`}>
          <div className="flex items-baseline justify-between gap-6 border-b border-border pb-4">
            <h2 id="maison-edit" className={maisonLabel}>The edit</h2>
            <Link href="/shop" className={`${maisonLabel} ${maisonLink}`}>View all</Link>
          </div>
          <ul className={`mt-10 ${MAISON_GRID}`}>
            {featured.map((product) => (
              <li key={product.id}>
                <MaisonProductCard product={product} store={store} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {story && (
        <section aria-label={`About ${store.name}`} className="border-t border-border">
          <div className={`${MAISON_CONTAINER} mx-auto max-w-4xl py-20 text-center lg:py-28`}>
            <p className={`${maisonLabel} text-muted-foreground`}>The house</p>
            <p className="mt-8 text-balance font-heading text-3xl italic leading-snug lg:text-5xl">{story}</p>
            <Link href="/about" className={`mt-10 inline-block ${maisonLabel} ${maisonLink}`}>Our story</Link>
          </div>
        </section>
      )}

      <section aria-label="Client service" className="border-t border-border">
        <dl className={`${MAISON_CONTAINER} grid md:grid-cols-3`}>
          <div className="py-10 md:pe-8">
            <dt className={maisonLabel}>Delivery</dt>
            <dd className="mt-3 text-sm leading-relaxed text-muted-foreground">Delivery charges are stated on every piece. Pieces marked for collection are collected from {store.name}.</dd>
          </div>
          <div className="border-t border-border py-10 md:border-s md:border-t-0 md:px-8">
            <dt className={maisonLabel}>Payment</dt>
            <dd className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {store.paymentMethods.length > 0
                ? `${store.paymentMethods.map((id) => paymentMethodLabel(id)).join(", ")}. Prices in ${store.currency}.`
                : `Prices in ${store.currency}.`}
            </dd>
          </div>
          <div className="border-t border-border py-10 md:border-s md:border-t-0 md:ps-8">
            <dt className={maisonLabel}>Client service</dt>
            <dd className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Questions about a piece, sizing or delivery?{" "}
              <Link href="/contact" className={`text-foreground ${maisonLink}`}>Write to us</Link>.
            </dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
