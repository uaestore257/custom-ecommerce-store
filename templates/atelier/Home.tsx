import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CategoryImage } from "@/components/CategoryImage";
import { ProductImage } from "@/components/ProductImage";
import { paymentMethodLabel } from "@/lib/config";
import { categoryNameOf } from "@/lib/storefront-cart";
import { categoryPath } from "@/lib/storefront-urls";
import type { TemplateHomeProps } from "../types";
import { AtelierProductCard } from "./ProductCard";
import { ATELIER_CONTAINER, atelierEyebrow, atelierTextLink } from "./styles";

export function AtelierHome({ store, categories, featured }: TemplateHomeProps) {
  const collections = categories.filter((category) => category.slug && category.productCount > 0);
  const heroProduct = featured.find((product) => product.imageUrl);
  const heroImage = heroProduct?.imageUrl || collections.find((category) => category.imageUrl)?.imageUrl || "";
  const title = store.heroTitle || store.name;
  const [lead, ...rest] = featured;
  const story = store.aboutText.split(/\n+/).find(Boolean) ?? "";

  return (
    <main>
      <Hero
        layout={store.theme.hero === "full-bleed" ? "full-bleed" : "split"}
        eyebrow={store.tagline}
        title={title}
        text={store.heroText}
        image={heroImage}
      />

      {collections.length > 0 && (
        <section aria-labelledby="atelier-index" className={`${ATELIER_CONTAINER} py-20 lg:py-28`}>
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className={atelierEyebrow}>Index</p>
              <h2 id="atelier-index" className="mt-4 font-heading text-4xl font-medium leading-tight lg:text-5xl">The collection</h2>
            </div>
            <ol className="lg:col-span-8">
              {collections.map((category, index) => (
                <li key={category.id} className="border-t border-border last:border-b">
                  <Link
                    href={categoryPath(category)}
                    className="group grid grid-cols-[3rem_1fr_auto] items-center gap-4 py-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus sm:grid-cols-[4rem_1fr_auto_5rem]"
                  >
                    <span className="text-xs tabular-nums text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                    <span className="font-heading text-3xl transition group-hover:translate-x-1 rtl:group-hover:-translate-x-1 sm:text-4xl">{category.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {category.productCount} {category.productCount === 1 ? "piece" : "pieces"}
                    </span>
                    <span className="hidden sm:block">
                      <CategoryImage src={category.imageUrl} alt="" className="aspect-[4/5] w-20" />
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {lead && (
        <section aria-labelledby="atelier-selected" className="border-t border-border bg-surface py-20 lg:py-28">
          <div className={ATELIER_CONTAINER}>
            <div className="flex items-end justify-between gap-6">
              <div>
                <p className={atelierEyebrow}>Featured</p>
                <h2 id="atelier-selected" className="mt-4 font-heading text-4xl font-medium leading-tight lg:text-5xl">Selected pieces</h2>
              </div>
              <Link href="/shop" className={`hidden text-sm sm:inline-flex sm:items-center sm:gap-2 ${atelierTextLink}`}>
                View all pieces <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
              </Link>
            </div>
            <div className="mt-12 grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-12 lg:gap-x-8">
              <div className="col-span-2 lg:col-span-6 lg:row-span-2">
                <AtelierProductCard product={lead} store={store} categoryName={categoryNameOf(categories, lead.categoryId)} size="feature" />
              </div>
              {rest.map((product) => (
                <div key={product.id} className="lg:col-span-3">
                  <AtelierProductCard product={product} store={store} categoryName={categoryNameOf(categories, product.categoryId)} />
                </div>
              ))}
            </div>
            <Link href="/shop" className={`mt-12 inline-flex items-center gap-2 text-sm sm:hidden ${atelierTextLink}`}>
              View all pieces <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
            </Link>
          </div>
        </section>
      )}

      {story && (
        <section aria-label={`About ${store.name}`} className={`${ATELIER_CONTAINER} grid gap-10 py-20 lg:grid-cols-12 lg:py-28`}>
          <p className={`lg:col-span-3 ${atelierEyebrow}`}>The atelier</p>
          <div className="lg:col-span-8">
            <p className="font-heading text-3xl font-normal italic leading-snug lg:text-4xl">{story}</p>
            <Link href="/about" className={`mt-8 inline-flex items-center gap-2 text-sm ${atelierTextLink}`}>
              Our story <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
            </Link>
          </div>
        </section>
      )}

      <section aria-label="Service" className="border-t border-border">
        <dl className={`${ATELIER_CONTAINER} grid gap-10 py-16 md:grid-cols-3`}>
          <div>
            <dt className={atelierEyebrow}>Delivery</dt>
            <dd className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Delivery charges are stated on every piece. Pieces marked for pickup are collected from {store.name}.
            </dd>
          </div>
          <div>
            <dt className={atelierEyebrow}>Payment</dt>
            <dd className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {store.paymentMethods.length > 0
                ? `${store.paymentMethods.map((id) => paymentMethodLabel(id)).join(", ")}. Prices in ${store.currency}.`
                : `Prices in ${store.currency}.`}
            </dd>
          </div>
          <div>
            <dt className={atelierEyebrow}>Enquiries</dt>
            <dd className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Questions about a piece, its dimensions or delivery?{" "}
              <Link href="/contact" className={`text-foreground ${atelierTextLink}`}>Write to us</Link>.
            </dd>
          </div>
        </dl>
      </section>
    </main>
  );
}

function Hero({
  layout,
  eyebrow,
  title,
  text,
  image,
}: {
  layout: "split" | "full-bleed";
  eyebrow: string;
  title: string;
  text: string;
  image: string;
}) {
  const cta = (
    <Link href="/shop" className={`mt-10 inline-flex items-center gap-2 text-sm ${atelierTextLink}`}>
      Explore the collection <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
    </Link>
  );

  // Without a photograph the hero is purely typographic — never an empty frame.
  if (!image || layout === "full-bleed") {
    return (
      <section>
        {image && <ProductImage src={image} alt="" priority className="aspect-[4/5] w-full sm:aspect-[16/9] lg:aspect-[21/9]" />}
        <div className={`${ATELIER_CONTAINER} grid gap-8 py-14 lg:grid-cols-12 lg:py-20`}>
          <div className="lg:col-span-7">
            {eyebrow && <p className={atelierEyebrow}>{eyebrow}</p>}
            <h1 className="mt-5 font-heading text-5xl font-normal leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">{title}</h1>
          </div>
          <div className="self-end lg:col-span-4 lg:col-start-9">
            {text && <p className="text-base leading-relaxed text-muted-foreground">{text}</p>}
            {cta}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="grid lg:min-h-[calc(100dvh-5rem)] lg:grid-cols-12">
      <div className="order-2 flex flex-col justify-end px-5 py-14 sm:px-8 lg:order-1 lg:col-span-5 lg:px-12 lg:py-20">
        {eyebrow && <p className={atelierEyebrow}>{eyebrow}</p>}
        <h1 className="mt-5 font-heading text-5xl font-normal leading-[1.02] tracking-tight sm:text-6xl xl:text-7xl">{title}</h1>
        {text && <p className="mt-8 max-w-md text-base leading-relaxed text-muted-foreground">{text}</p>}
        {cta}
      </div>
      <div className="order-1 lg:order-2 lg:col-span-7">
        <ProductImage src={image} alt="" priority className="aspect-[4/5] h-full w-full lg:aspect-auto" />
      </div>
    </section>
  );
}
