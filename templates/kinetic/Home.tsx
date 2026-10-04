import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CategoryImage } from "@/components/CategoryImage";
import { ProductImage } from "@/components/ProductImage";
import { paymentMethodLabel } from "@/lib/config";
import { categoryNameOf, formatStoreMoney, isProductOnSale, productDeliveryDescription } from "@/lib/storefront-cart";
import { categoryPath, productPath } from "@/lib/storefront-urls";
import type { TemplateHomeProps } from "../types";
import { KINETIC_GRID, KineticProductCard } from "./ProductCard";
import { KineticPurchase } from "./Purchase";
import { accentBlock, KINETIC_CONTAINER, kineticEyebrow, kineticInkButton, kineticOutlineButton } from "./styles";

export function KineticHome({ store, categories, featured }: TemplateHomeProps) {
  const block = accentBlock(store.theme);
  const collections = categories.filter((category) => category.slug && category.productCount > 0);
  // The hero sells a real product: the first featured one in stock.
  const hero = featured.find((product) => product.stock > 0) ?? null;
  const grid = featured.filter((product) => product.id !== hero?.id).slice(0, 8);
  const story = store.aboutText.split(/\n+/).find(Boolean) ?? "";

  return (
    <main>
      <section aria-labelledby="kinetic-hero" className="border-b-2 border-foreground">
        <div className={`grid lg:grid-cols-12 ${hero ? "" : "lg:grid-cols-1"}`}>
          <div className={`flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-10 lg:py-20 ${block.surface} ${hero ? "lg:col-span-7" : ""}`}>
            {store.tagline && <p className={kineticEyebrow}>{store.tagline}</p>}
            <h1 id="kinetic-hero" className="mt-4 max-w-3xl text-balance font-heading text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-6xl xl:text-7xl rtl:tracking-normal">
              {store.heroTitle || store.name}
            </h1>
            {store.heroText && <p className={`mt-6 max-w-xl text-base leading-relaxed sm:text-lg ${block.quiet}`}>{store.heroText}</p>}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/shop" className={`${kineticInkButton} w-auto`}>
                Shop all products <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
              </Link>
              {hero && (
                <Link href={productPath(hero)} className={`${kineticOutlineButton} w-auto lg:hidden`}>
                  View {hero.name}
                </Link>
              )}
            </div>
          </div>

          {hero && (
            <div className="border-t-2 border-foreground bg-surface px-4 py-8 sm:px-6 lg:col-span-5 lg:border-s-2 lg:border-t-0 lg:px-10 lg:py-12">
              <p className={`${kineticEyebrow} text-muted-foreground`}>Featured product</p>
              <div className="mt-4 grid gap-5 sm:grid-cols-[minmax(0,14rem)_1fr] lg:grid-cols-1">
                <Link href={productPath(hero)} tabIndex={-1} aria-hidden className="block overflow-hidden rounded-card border-2 border-foreground bg-accent/10">
                  <ProductImage src={hero.imageUrl} alt={hero.name} priority className="aspect-square w-full lg:aspect-[4/3]" />
                </Link>
                <div className="min-w-0">
                  <h2 className="font-heading text-2xl font-extrabold leading-tight sm:text-3xl">
                    <Link href={productPath(hero)} className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-focus">{hero.name}</Link>
                  </h2>
                  <p className="mt-2 flex flex-wrap items-baseline gap-x-3 tabular-nums">
                    <span className="text-xl font-extrabold">
                      {isProductOnSale(hero) && <span className="sr-only">Sale price </span>}
                      {formatStoreMoney(store, hero.priceMinor)}
                    </span>
                    {isProductOnSale(hero) && hero.compareAtMinor && (
                      <span className="text-sm text-muted-foreground line-through">
                        <span className="sr-only">Original price </span>
                        {formatStoreMoney(store, hero.compareAtMinor)}
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{productDeliveryDescription(hero, store)}</p>
                  <KineticPurchase product={hero} shownStoreId={store.id} className="mt-5" />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {collections.length > 0 && (
        <section aria-labelledby="kinetic-categories" className={`${KINETIC_CONTAINER} py-12 lg:py-16`}>
          <div className="flex items-end justify-between gap-4">
            <h2 id="kinetic-categories" className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl rtl:tracking-normal">Shop by category</h2>
            <Link href="/shop" className="hidden shrink-0 items-center gap-1.5 text-sm font-bold underline underline-offset-4 sm:inline-flex">
              All products <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
            </Link>
          </div>
          <ul className="-mx-4 mt-6 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:scroll-px-0 sm:px-0">
            {collections.map((category) => (
              <li key={category.id} className="w-40 shrink-0 snap-start sm:w-48">
                <Link
                  href={categoryPath(category)}
                  className="group block overflow-hidden rounded-card border-2 border-foreground bg-surface transition duration-150 hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  <CategoryImage src={category.imageUrl} alt="" className="aspect-square w-full border-b-2 border-foreground" />
                  <span className="flex items-center justify-between gap-2 px-3 py-2.5">
                    <span className="truncate font-heading text-base font-bold">{category.name}</span>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">{category.productCount}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {grid.length > 0 && (
        <section aria-labelledby="kinetic-featured" className={`${KINETIC_CONTAINER} pb-14 lg:pb-20`}>
          <div className="flex items-end justify-between gap-4">
            <h2 id="kinetic-featured" className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl rtl:tracking-normal">Featured</h2>
            <Link href="/shop" className="inline-flex shrink-0 items-center gap-1.5 text-sm font-bold underline underline-offset-4">
              View all <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
            </Link>
          </div>
          <ul className={`mt-6 ${KINETIC_GRID}`}>
            {grid.map((product) => (
              <li key={product.id} className="min-w-0">
                <KineticProductCard product={product} store={store} categoryName={categoryNameOf(categories, product.categoryId)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {story && (
        <section aria-label={`About ${store.name}`} className={`border-y-2 border-foreground ${block.surface}`}>
          <div className={`${KINETIC_CONTAINER} grid gap-6 py-14 lg:grid-cols-12 lg:py-20`}>
            <p className={`${kineticEyebrow} lg:col-span-3`}>About {store.name}</p>
            <div className="lg:col-span-9">
              <p className="text-balance font-heading text-3xl font-bold leading-tight sm:text-4xl">{story}</p>
              <Link href="/about" className={`${kineticInkButton} mt-8 w-auto`}>
                Our story <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      )}

      <section aria-label="Delivery, payment and help" className={`${KINETIC_CONTAINER} py-12`}>
        <dl className="grid gap-[2px] overflow-hidden rounded-card border-2 border-foreground bg-foreground md:grid-cols-3">
          <div className="bg-surface p-5">
            <dt className={kineticEyebrow}>Delivery</dt>
            <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">Delivery charges are shown on every product. Pickup-only items are collected from {store.name}.</dd>
          </div>
          <div className="bg-surface p-5">
            <dt className={kineticEyebrow}>Payment</dt>
            <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {store.paymentMethods.length > 0
                ? `${store.paymentMethods.map((id) => paymentMethodLabel(id)).join(", ")}. Prices in ${store.currency}.`
                : `Prices in ${store.currency}.`}
            </dd>
          </div>
          <div className="bg-surface p-5">
            <dt className={kineticEyebrow}>Help</dt>
            <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Questions about an order or a product?{" "}
              <Link href="/contact" className="font-bold text-foreground underline underline-offset-4">Contact us</Link>.
            </dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
