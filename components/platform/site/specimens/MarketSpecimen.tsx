import { Home as HomeIcon, LayoutGrid, Minus, Plus, Search, ShoppingCart } from "lucide-react";
import type { SpecimenCatalogue, SpecimenProduct } from "./catalogue";
import { FurniturePlate } from "./FurniturePlate";
import type { SpecimenViewProps } from "./types";

// A miniature of templates/market at specimen scale (sizes in em of the
// specimen's base size). Mirrors the template's structure: a header with a
// large search field and the cart total, the category bar, a compact
// store-facts band instead of a hero, one product SHELF per category,
// compact price-first cards with Add / stepper, and on narrow frames the
// running cart bar over the bottom tab bar. Container queries (@xl).

const container = "px-[1em] @xl:px-[1.8em]";

function Header({ c, active = -1 }: { c: SpecimenCatalogue; active?: number }) {
  return (
    <div className="border-b border-border bg-surface">
      <div className={`flex flex-wrap items-center gap-x-[1em] gap-y-[0.5em] py-[0.7em] @xl:flex-nowrap ${container}`}>
        <span className="truncate font-heading text-[1.15em] font-extrabold tracking-tight">{c.storeName}</span>
        <span className="order-3 flex h-[3em] w-full items-center gap-[0.6em] rounded-control border border-border bg-muted px-[0.9em] text-[0.85em] text-muted-foreground @xl:order-none @xl:flex-1">
          <Search className="h-[1.2em] w-[1.2em]" aria-hidden /> Search {c.storeName}
        </span>
        <span className="ms-auto flex h-[2.6em] items-center gap-[0.4em] rounded-control bg-accent px-[0.8em] text-[0.8em] font-bold text-accent-foreground @xl:ms-0">
          <ShoppingCart className="h-[1.2em] w-[1.2em]" aria-hidden /> 3<span className="hidden border-s border-accent-foreground/30 ps-[0.5em] @2xl:inline">{c.subtotal}</span>
        </span>
      </div>
      <div className={`flex gap-[0.5em] overflow-hidden border-t border-border py-[0.6em] ${container}`}>
        {["All products", ...c.categories.map((category) => category.name)].map((name, index) => (
          <span key={name} className={`shrink-0 whitespace-nowrap rounded-full border px-[0.9em] py-[0.3em] text-[0.72em] font-semibold ${index === active + 1 ? "border-accent bg-accent text-accent-foreground" : "border-border bg-surface"}`}>
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}

function Card({ product, inCart = 0 }: { product: SpecimenProduct; inCart?: number }) {
  return (
    <div className="flex min-w-0 flex-col rounded-card border border-border bg-surface p-[0.5em]">
      <FurniturePlate kind={product.plate} ratio="1:1" className="aspect-square w-full rounded-control" />
      <p className="mt-[0.5em] text-[0.95em] font-extrabold tabular-nums">{product.price}</p>
      <p className="line-clamp-2 min-h-[2.6em] text-[0.72em] font-medium leading-[1.3em]">{product.name}</p>
      {inCart > 0 ? (
        <span className="mt-[0.5em] flex h-[2.6em] items-center justify-between rounded-control bg-accent px-[0.7em] text-[0.75em] font-bold text-accent-foreground">
          <Minus className="h-[1em] w-[1em]" aria-hidden /> {inCart} <Plus className="h-[1em] w-[1em]" aria-hidden />
        </span>
      ) : (
        <span className="mt-[0.5em] flex h-[2.6em] items-center justify-center rounded-control bg-accent text-[0.75em] font-bold text-accent-foreground">Add</span>
      )}
    </div>
  );
}

function TabBar({ c }: { c: SpecimenCatalogue }) {
  return (
    <div className="absolute inset-x-0 bottom-0 @xl:hidden">
      <div className="px-[0.8em] pb-[0.5em]">
        <span className="flex h-[3em] items-center justify-between rounded-control bg-accent px-[1em] text-[0.8em] font-bold text-accent-foreground">
          <span>3 items · {c.subtotal}</span> <span>View cart</span>
        </span>
      </div>
      <div className="flex border-t border-border bg-surface">
        {[
          [HomeIcon, "Home"],
          [LayoutGrid, "Categories"],
          [Search, "Search"],
          [ShoppingCart, "Cart"],
        ].map(([Icon, label], index) => {
          const TabIcon = Icon as typeof HomeIcon;
          return (
            <span key={label as string} className={`flex h-[3.6em] flex-1 flex-col items-center justify-center gap-[0.15em] text-[0.62em] font-semibold ${index === 0 ? "text-accent" : "text-muted-foreground"}`}>
              <TabIcon className="h-[1.6em] w-[1.6em]" aria-hidden /> {label as string}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function Home({ catalogue: c }: SpecimenViewProps) {
  const shelves = c.categories.slice(0, 2).map((category) => ({ category, products: c.products.filter((p) => p.category === category.name) }));
  return (
    <div className="relative pb-[7em] @xl:pb-0">
      <Header c={c} />
      <div className={`flex flex-wrap items-center justify-between gap-[0.6em] border-b border-border bg-surface py-[0.9em] ${container}`}>
        <div className="min-w-0">
          <p className="truncate font-heading text-[1.3em] font-extrabold">{c.storeName}</p>
          <p className="truncate text-[0.75em] text-muted-foreground">{c.tagline}</p>
        </div>
        <span className="flex gap-[0.4em]">
          <span className="rounded-full bg-muted px-[0.8em] py-[0.25em] text-[0.62em] font-semibold">Pay by card or cash</span>
          <span className="hidden rounded-full bg-muted px-[0.8em] py-[0.25em] text-[0.62em] font-semibold @xl:inline">Delivery or pickup</span>
        </span>
      </div>
      {shelves.map(({ category, products }, index) => (
        <div key={category.name} className={`pt-[1.2em] ${container}`}>
          <p className="flex items-baseline justify-between">
            <span className="font-heading text-[1.15em] font-extrabold">{category.name}</span>
            <span className="text-[0.72em] font-semibold text-accent">See all {category.count}</span>
          </p>
          <div className="mt-[0.6em] grid grid-cols-2 gap-[0.5em] @xl:grid-cols-5">
            {[...products, ...c.products].slice(0, 5).map((product, i) => (
              <div key={`${product.name}-${i}`} className={i >= 2 ? "hidden @xl:block" : ""}>
                <Card product={product} inCart={index === 0 && i === 0 ? 2 : 0} />
              </div>
            ))}
          </div>
        </div>
      ))}
      <TabBar c={c} />
    </div>
  );
}

function Product({ catalogue: c }: SpecimenViewProps) {
  const product = c.products[1];
  return (
    <div className="relative pb-[7em] @xl:pb-0">
      <Header c={c} active={0} />
      <div className={`grid gap-[1.2em] py-[1.2em] @xl:grid-cols-[5fr_6fr] ${container}`}>
        <div className="rounded-card border border-border bg-surface p-[0.8em]">
          <FurniturePlate kind={product.plate} ratio="1:1" className="aspect-square w-full" />
        </div>
        <div className="min-w-0">
          <p className="font-heading text-[1.6em] font-extrabold leading-tight">{product.name}</p>
          <p className="mt-[0.3em] text-[2em] font-extrabold tabular-nums">{product.price}</p>
          <p className="mt-[0.6em] flex flex-wrap gap-[0.4em] text-[0.65em] font-semibold">
            <span className="rounded-full bg-muted px-[0.9em] py-[0.3em]">Delivery: {c.delivery}</span>
            <span className="rounded-full bg-success/10 px-[0.9em] py-[0.3em] text-success">In stock</span>
          </p>
          <div className="mt-[1em] flex gap-[0.5em]">
            <span className="inline-flex h-[3em] items-center gap-[1em] rounded-control border border-border bg-surface px-[0.9em] text-[0.8em] font-bold tabular-nums">
              <Minus className="h-[1em] w-[1em]" aria-hidden /> 1 <Plus className="h-[1em] w-[1em]" aria-hidden />
            </span>
            <span className="flex h-[3em] flex-1 items-center justify-center rounded-control bg-accent text-[0.8em] font-bold text-accent-foreground">Add to cart</span>
          </div>
          <p className="mt-[1em] border-t border-border pt-[0.8em] text-[0.78em] leading-relaxed text-muted-foreground">{c.description}</p>
        </div>
      </div>
      <TabBar c={c} />
    </div>
  );
}

function Cart({ catalogue: c }: SpecimenViewProps) {
  return (
    <div className="relative pb-[4em] @xl:pb-0">
      <Header c={c} />
      <div className={`py-[1.2em] ${container}`}>
        <p className="font-heading text-[1.6em] font-extrabold">Your cart</p>
        <div className="mt-[0.8em] grid gap-[1em] @xl:grid-cols-[1fr_16em]">
          <ul className="divide-y divide-border rounded-card border border-border bg-surface">
            {c.products.slice(0, 3).map((product, index) => (
              <li key={product.name} className="grid grid-cols-[3.4em_1fr_auto] items-center gap-[0.8em] p-[0.7em]">
                <FurniturePlate kind={product.plate} ratio="1:1" className="aspect-square w-full rounded-control" />
                <div className="min-w-0">
                  <p className="truncate text-[0.8em] font-semibold">{product.name}</p>
                  <span className="mt-[0.3em] inline-flex items-center gap-[0.8em] rounded-control border border-border px-[0.6em] py-[0.2em] text-[0.7em] tabular-nums">
                    <Minus className="h-[1em] w-[1em]" aria-hidden /> {index === 0 ? 2 : 1} <Plus className="h-[1em] w-[1em]" aria-hidden />
                  </span>
                </div>
                <span className="text-[0.8em] font-extrabold tabular-nums">{product.price}</span>
              </li>
            ))}
          </ul>
          <div className="h-fit rounded-card border border-border bg-surface p-[0.9em]">
            <p className="flex justify-between text-[0.85em] font-bold">
              <span>Subtotal</span> <span className="tabular-nums">{c.subtotal}</span>
            </p>
            <span className="mt-[0.8em] flex h-[3em] items-center justify-center rounded-control bg-accent text-[0.8em] font-bold text-accent-foreground">Checkout</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export const MarketSpecimen = { home: Home, product: Product, cart: Cart } as const;
