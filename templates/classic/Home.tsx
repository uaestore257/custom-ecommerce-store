import Link from "next/link";
import { CreditCard, Tag, Truck } from "lucide-react";
import { CategoryImage } from "@/components/CategoryImage";
import { ProductImage } from "@/components/ProductImage";
import { SfLinkButton } from "@/components/storefront/primitives";
import { paymentMethodLabel } from "@/lib/config";
import { categoryNameOf } from "@/lib/storefront-cart";
import { categoryPath } from "@/lib/storefront-urls";
import type { TemplateHomeProps } from "../types";
import { PRODUCT_GRID, ProductCard } from "./ProductCard";

export function ClassicHome({ store, categories, featured }: TemplateHomeProps) {
  const shown = featured.slice(0, 4);
  const listed = categories.filter((category) => category.slug);
  const heroImage = featured.find((product) => product.imageUrl)?.imageUrl ?? "";
  const offlineMethods = store.paymentMethods.filter((id) => id !== "online_card").map((id) => paymentMethodLabel(id));

  return (
    <main>
      {/* Hero */}
      <section className={`mx-auto grid max-w-6xl items-center gap-10 px-4 py-8 sm:px-6 sm:py-16 md:py-24 ${heroImage ? "md:grid-cols-2" : "text-center [&_p]:mx-auto [&>div>div]:justify-center"}`}>
        <div>
          {store.tagline && <p className="text-xs font-semibold uppercase tracking-wide text-accent sm:text-sm">{store.tagline}</p>}
          <h1 className="mt-2 font-heading text-3xl font-bold leading-tight tracking-tight sm:mt-3 sm:text-5xl">
            {store.heroTitle || store.name}
          </h1>
          {store.heroText && (
            <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground sm:mt-5 sm:text-lg">{store.heroText}</p>
          )}
          <div className="mt-6 flex flex-wrap gap-3 sm:mt-8">
            <SfLinkButton href="/shop" size="lg" className="rounded-full">Shop now</SfLinkButton>
            <SfLinkButton href="/about" variant="secondary" size="lg" className="rounded-full">About us</SfLinkButton>
          </div>
        </div>
        {heroImage && (
          <ProductImage src={heroImage} alt="" priority className="hidden aspect-square w-full rounded-card md:block" />
        )}
      </section>

      {/* Shop by Category */}
      {listed.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 sm:pb-20">
          <h2 className="text-center font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Shop by Category</h2>
          <ul className="mt-6 grid grid-cols-1 gap-8 sm:mt-10 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {listed.map((category) => (
              <li key={category.id} className="min-w-0">
                <Link
                  href={categoryPath(category)}
                  className="group block rounded-card focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-4"
                >
                  <div className="overflow-hidden rounded-card bg-muted">
                    <CategoryImage src={category.imageUrl} alt={category.name} className="aspect-[16/10] w-full transition duration-500 group-hover:scale-[1.03]" />
                  </div>
                  <p className="mt-3 text-center font-heading text-xl text-foreground group-hover:text-accent sm:text-2xl">{category.name}</p>
                  <p className="text-center text-xs text-muted-foreground sm:text-sm">
                    {category.productCount > 0
                      ? `${category.productCount} ${category.productCount === 1 ? "product" : "products"}`
                      : "Coming soon"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Featured products */}
      <section className="bg-muted py-10 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-4xl">Featured Products</h2>
            <Link href="/shop" className="text-sm font-semibold text-accent hover:underline">View all</Link>
          </div>
          {shown.length === 0 ? (
            <p className="mt-6 text-muted-foreground">New products are coming soon.</p>
          ) : (
            <div className={`mt-4 sm:mt-8 ${PRODUCT_GRID}`}>
              {shown.map((product) => (
                <ProductCard key={product.id} product={product} store={store} categoryName={categoryNameOf(categories, product.categoryId)} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Service notes + call to action */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          <Benefit icon={Truck} title="Delivery">
            Delivery options and charges are shown on each product. Pickup-only items are marked.
          </Benefit>
          <Benefit icon={CreditCard} title="Pay on your terms">
            {offlineMethods.length > 0 ? offlineMethods.join(", ") + "." : "Payment options coming soon."}
          </Benefit>
          <Benefit icon={Tag} title="Clear prices">
            All prices in {store.currency}, shown clearly before checkout.
          </Benefit>
        </div>

        <div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-card bg-accent px-5 py-7 text-accent-foreground sm:mt-10 sm:flex-row sm:items-center sm:px-10 sm:py-10">
          <div>
            <h2 className="font-heading text-xl font-bold sm:text-2xl">Questions before you order?</h2>
            <p className="mt-1 opacity-85">Our team is happy to help you choose.</p>
          </div>
          <Link
            href="/contact"
            className="rounded-full bg-background px-6 py-3 font-semibold text-foreground hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-background focus-visible:ring-offset-2 focus-visible:ring-offset-accent"
          >
            Contact us
          </Link>
        </div>
      </section>
    </main>
  );
}

function Benefit({ icon: Icon, title, children }: { icon: typeof Truck; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-border bg-surface p-4 sm:p-5">
      <Icon className="h-6 w-6 text-accent" aria-hidden />
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
