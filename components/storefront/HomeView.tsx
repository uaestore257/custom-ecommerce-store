"use client";

import Link from "next/link";
import { ArrowRight, CreditCard, Tag, Truck } from "lucide-react";
import { LinkButton } from "@/components/ui";
import { paymentMethodLabel } from "@/lib/config";
import { formatMoney } from "@/lib/format";
import { categoryName } from "@/lib/demo-db";
import { useStorefront } from "@/lib/storefront";
import { PRODUCT_GRID, ProductCard } from "./ProductCard";

export function HomeView() {
  const view = useStorefront();
  if (!view) return null;
  const { store, data, products, cartLines } = view;
  const { settings } = store;

  // Up to 4 products (one full desktop row): featured first, then others.
  const shownFeatured = [
    ...products.filter((p) => p.featured),
    ...products.filter((p) => !p.featured),
  ].slice(0, 4);
  const categories = data.categories
    .map((category) => ({
      ...category,
      count: products.filter((p) => p.categoryId === category.id).length,
    }))
    .filter((category) => category.count > 0);
  const offlineMethods = settings.paymentMethods
    .filter((m) => m.enabled && m.id !== "online_card")
    .map((m) => paymentMethodLabel(m.id));

  return (
    <main>
      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-8 sm:px-6 sm:py-16 md:grid-cols-2 md:py-24">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand sm:text-sm">{settings.tagline}</p>
          <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight sm:mt-3 sm:text-5xl">
            {settings.heroTitle}
          </h1>
          <p className="mt-3 max-w-md text-base leading-relaxed text-slate-600 sm:mt-5 sm:text-lg">{settings.heroText}</p>
          <div className="mt-6 flex flex-wrap gap-3 sm:mt-8">
            <LinkButton href="/shop" tone="brand" size="lg" className="rounded-full">
              Shop now
            </LinkButton>
            <LinkButton href="/about" variant="secondary" size="lg" className="rounded-full">
              About us
            </LinkButton>
          </div>
        </div>

        {/* Decorative hero blocks (replace with a real image later) */}
        <div className="hidden aspect-square grid-cols-2 grid-rows-2 gap-3 md:grid" aria-hidden>
          <div className="row-span-2 rounded-3xl bg-brand/15" />
          <div className="rounded-3xl bg-amber-100" />
          <div className="rounded-3xl bg-slate-200" />
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6 sm:pb-16">
          <h2 className="text-xl font-bold tracking-tight sm:text-3xl">Shop by category</h2>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-4 lg:grid-cols-4">
            {categories.map((category) => (
              <li key={category.id} className="min-w-0">
                <Link
                  href={`/shop?category=${encodeURIComponent(category.id)}`}
                  className="group flex items-center justify-between gap-2 rounded-xl border border-slate-200 p-3.5 transition sm:rounded-2xl sm:p-5 hover:border-brand hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-900 sm:text-base">{category.name}</span>
                    <span className="text-xs text-slate-500 sm:text-sm">
                      {category.count} {category.count === 1 ? "product" : "products"}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition sm:h-5 sm:w-5 group-hover:translate-x-0.5 group-hover:text-brand" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Featured products */}
      <section className="bg-slate-50 py-10 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-xl font-bold tracking-tight sm:text-3xl">Featured products</h2>
            <Link href="/shop" className="text-sm font-semibold text-brand hover:underline">
              View all
            </Link>
          </div>
          {shownFeatured.length === 0 ? (
            <p className="mt-6 text-slate-600">New products are coming soon.</p>
          ) : (
            <div className={`mt-4 sm:mt-8 ${PRODUCT_GRID}`}>
              {shownFeatured.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  shownStoreId={store.id}
                  categoryName={categoryName(data, product.categoryId)}
                  currency={settings.currency}
                  inCart={cartLines.find((l) => l.product.id === product.id)?.quantity ?? 0}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Benefits + call to action */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          <Benefit icon={Truck} title="Delivery">
            {settings.freeDeliveryThreshold > 0
              ? `Free delivery on orders over ${formatMoney(settings.freeDeliveryThreshold, settings.currency)}.`
              : `Flat delivery fee of ${formatMoney(settings.deliveryFee, settings.currency)}.`}
          </Benefit>
          <Benefit icon={CreditCard} title="Pay on your terms">
            {offlineMethods.length > 0 ? offlineMethods.join(", ") + "." : "Payment options coming soon."}
          </Benefit>
          <Benefit icon={Tag} title="Fair prices">
            All prices in {settings.currency}, shown clearly before checkout.
          </Benefit>
        </div>

        <div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-2xl bg-brand px-5 py-7 text-white sm:mt-10 sm:flex-row sm:items-center sm:rounded-3xl sm:px-10 sm:py-10">
          <div>
            <h2 className="text-xl font-bold sm:text-2xl">Questions before you order?</h2>
            <p className="mt-1 text-white/85">Our team is happy to help you choose.</p>
          </div>
          <Link
            href="/contact"
            className="rounded-full bg-white px-6 py-3 font-semibold text-slate-900 hover:bg-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand"
          >
            Contact us
          </Link>
        </div>
      </section>
    </main>
  );
}

function Benefit({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Truck;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4 sm:p-5">
      <Icon className="h-6 w-6 text-brand" aria-hidden />
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{children}</p>
    </div>
  );
}
