import { CreditCard, Menu, Minus, Plus, ShoppingCart, Truck } from "lucide-react";
import type { SpecimenCatalogue, SpecimenProduct } from "./catalogue";
import { FurniturePlate } from "./FurniturePlate";
import type { SpecimenViewProps } from "./types";

// A miniature of templates/classic at specimen scale: one inline bar with
// a cart count, a two-column hero with rounded buttons, a category card
// grid, square product cards with quick add, a two-column product page
// and a dedicated cart page with an order summary. See AtelierSpecimen
// for the sizing and container-query conventions.

const container = "px-[1.6em] @xl:px-[2.4em]";
const button = "inline-flex items-center justify-center gap-[0.5em] font-semibold";

function Header({ c }: { c: SpecimenCatalogue }) {
  return (
    <div className={`flex items-center justify-between gap-[1em] border-b border-border py-[1em] ${container}`}>
      <span className="flex min-w-0 items-center gap-[0.7em]">
        <span className="flex h-[2.2em] w-[2.2em] shrink-0 items-center justify-center rounded-[0.5em] bg-accent text-[0.9em] font-bold text-accent-foreground">
          {c.monogram}
        </span>
        <span className="truncate text-[1.2em] font-bold tracking-tight rtl:tracking-normal">{c.storeName}</span>
      </span>
      <span className="hidden items-center gap-[1.8em] text-[0.8em] font-medium text-muted-foreground @xl:flex">
        <span className="text-accent">Home</span>
        <span>Shop</span>
        <span>About</span>
        <span>Contact</span>
      </span>
      <span className="flex items-center gap-[0.6em]">
        <span className="relative flex h-[2.6em] w-[2.6em] items-center justify-center rounded-full">
          <ShoppingCart className="h-[1.4em] w-[1.4em]" aria-hidden />
          <span className="absolute -end-[0.1em] -top-[0.1em] flex h-[1.4em] min-w-[1.4em] items-center justify-center rounded-full bg-accent px-[0.3em] text-[0.62em] font-bold text-accent-foreground">
            2
          </span>
        </span>
        <Menu className="h-[1.4em] w-[1.4em] @xl:hidden" aria-hidden />
      </span>
    </div>
  );
}

function Card({ product, c }: { product: SpecimenProduct; c: SpecimenCatalogue }) {
  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-card border border-border bg-surface">
      <FurniturePlate kind={product.plate} ratio="1:1" className="aspect-square w-full" />
      <div className="flex flex-1 flex-col p-[0.8em]">
        <p className="truncate text-[0.62em] font-semibold uppercase tracking-wide text-accent rtl:tracking-normal">{product.category}</p>
        <p className="mt-[0.3em] line-clamp-2 text-[0.82em] font-medium leading-snug">{product.name}</p>
        <p className="mt-[0.4em] text-[0.85em] font-bold whitespace-nowrap text-accent">{product.price}</p>
        <p className="mt-[0.2em] text-[0.62em] text-muted-foreground">Delivery: {c.delivery}</p>
        <span className={`${button} mt-[0.8em] rounded-control bg-accent py-[0.55em] text-[0.7em] text-accent-foreground`}>
          <ShoppingCart className="h-[1.1em] w-[1.1em]" aria-hidden /> Add to cart
        </span>
      </div>
    </div>
  );
}

function Home({ catalogue: c }: SpecimenViewProps) {
  return (
    <>
      <Header c={c} />
      <div className={`grid items-center gap-[2em] py-[2.4em] @xl:grid-cols-2 @xl:py-[3.4em] ${container}`}>
        <div>
          <p className="text-[0.72em] font-semibold uppercase tracking-wide text-accent rtl:tracking-normal">{c.tagline}</p>
          <p className="mt-[0.5em] font-heading text-[2.2em] font-bold leading-tight tracking-tight @xl:text-[2.8em] rtl:tracking-normal">{c.heroTitle}</p>
          <p className="mt-[0.9em] max-w-[30em] text-[0.92em] leading-relaxed text-muted-foreground">{c.heroText}</p>
          <div className="mt-[1.5em] flex flex-wrap gap-[0.6em] text-[0.85em]">
            <span className={`${button} rounded-full bg-accent px-[1.6em] py-[0.8em] text-accent-foreground`}>Shop now</span>
            <span className={`${button} rounded-full border border-border bg-surface px-[1.6em] py-[0.8em]`}>About us</span>
          </div>
        </div>
        <div className="hidden overflow-hidden rounded-card @xl:block">
          <FurniturePlate kind="sofa" ratio="1:1" className="aspect-square w-full" />
        </div>
      </div>

      <div className={`pb-[2.4em] ${container}`}>
        <p className="text-center font-heading text-[1.8em] font-semibold tracking-tight rtl:tracking-normal">Shop by Category</p>
        <div className="mt-[1.4em] grid grid-cols-1 gap-[1.2em] @md:grid-cols-2 @xl:grid-cols-3">
          {c.categories.slice(0, 3).map((category) => (
            <div key={category.name} className="min-w-0">
              <div className="overflow-hidden rounded-card">
                <FurniturePlate kind={category.plate} ratio="16:10" className="aspect-[16/10] w-full" />
              </div>
              <p className="mt-[0.6em] text-center font-heading text-[1.2em]">{category.name}</p>
              <p className="text-center text-[0.7em] text-muted-foreground">
                {category.count} {category.count === 1 ? "product" : "products"}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className={`bg-muted py-[2.4em] ${container}`}>
        <div className="flex items-end justify-between gap-[1em]">
          <p className="font-heading text-[1.6em] font-semibold tracking-tight rtl:tracking-normal">Featured Products</p>
          <span className="text-[0.8em] font-semibold text-accent">View all</span>
        </div>
        <div className="mt-[1.2em] grid grid-cols-2 gap-[0.8em] @xl:grid-cols-4">
          {c.products.slice(0, 4).map((product) => (
            <Card key={product.name} product={product} c={c} />
          ))}
        </div>
      </div>
    </>
  );
}

function Quantity() {
  return (
    <span className="inline-flex items-center gap-[1em] rounded-control border border-border bg-surface px-[0.8em] py-[0.5em] text-[0.85em] tabular-nums">
      <Minus className="h-[1em] w-[1em]" aria-hidden /> 1 <Plus className="h-[1em] w-[1em]" aria-hidden />
    </span>
  );
}

function Product({ catalogue: c }: SpecimenViewProps) {
  const product = c.products[0];
  return (
    <>
      <Header c={c} />
      <p className={`pt-[1.2em] text-[0.72em] text-muted-foreground ${container}`}>
        Home <span aria-hidden>/</span> Shop <span aria-hidden>/</span> {product.category}
      </p>
      <div className={`grid gap-[2em] pb-[2.4em] pt-[1.2em] @xl:grid-cols-2 ${container}`}>
        <div className="overflow-hidden rounded-card">
          <FurniturePlate kind="sofa" ratio="1:1" className="aspect-square w-full" />
        </div>
        <div>
          <p className="text-[0.72em] font-semibold uppercase tracking-wide text-accent rtl:tracking-normal">{product.category}</p>
          <p className="mt-[0.4em] font-heading text-[2.1em] font-bold leading-tight">{product.name}</p>
          <p className="mt-[0.6em] text-[1.4em] font-bold text-accent">{product.price}</p>
          <p className="mt-[0.3em] text-[0.75em] text-muted-foreground">Delivery: {c.delivery}</p>
          <p className="mt-[1em] text-[0.88em] leading-relaxed text-muted-foreground">{c.description}</p>
          <p className="mt-[1em] text-[0.75em]">
            <span className="text-muted-foreground">Availability: </span>
            <span className="font-medium text-success">In stock</span>
          </p>
          <div className="mt-[1.2em] flex flex-wrap items-center gap-[0.6em]">
            <Quantity />
            <span className={`${button} flex-1 rounded-control bg-accent px-[1.4em] py-[0.75em] text-[0.85em] text-accent-foreground`}>
              <ShoppingCart className="h-[1.1em] w-[1.1em]" aria-hidden /> Add to cart
            </span>
          </div>
          <div className="mt-[1.4em] space-y-[0.7em] rounded-card border border-border bg-surface p-[1em] text-[0.75em] text-muted-foreground">
            <p className="flex items-center gap-[0.6em]">
              <Truck className="h-[1.3em] w-[1.3em] shrink-0 text-accent" aria-hidden /> Free delivery over {c.freeOver}
            </p>
            <p className="flex items-center gap-[0.6em]">
              <CreditCard className="h-[1.3em] w-[1.3em] shrink-0 text-accent" aria-hidden /> Cash or card on delivery
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function Cart({ catalogue: c }: SpecimenViewProps) {
  return (
    <>
      <Header c={c} />
      <div className={`py-[2em] ${container}`}>
        <p className="font-heading text-[2em] font-bold tracking-tight rtl:tracking-normal">Your cart</p>
        <div className="mt-[1.2em] grid gap-[1.2em] @xl:grid-cols-[1fr_17em]">
          <ul className="divide-y divide-border rounded-card border border-border bg-surface">
            {c.products.slice(0, 2).map((product) => (
              <li key={product.name} className="flex gap-[0.9em] p-[0.9em]">
                <span className="w-[4.6em] shrink-0 overflow-hidden rounded-control">
                  <FurniturePlate kind={product.plate} ratio="1:1" className="aspect-square w-full" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.88em] font-medium">{product.name}</span>
                  <span className="mt-[0.2em] block text-[0.82em] font-bold text-accent">{product.price}</span>
                  <span className="mt-[0.6em] flex items-center gap-[0.8em]">
                    <Quantity />
                    <span className="text-[0.72em] text-muted-foreground underline">Remove</span>
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <div className="h-fit rounded-card border border-border bg-surface p-[1.1em] text-[0.82em]">
            <p className="font-semibold">Order summary</p>
            <p className="mt-[0.9em] flex justify-between text-muted-foreground">
              <span>Subtotal</span> <span className="tabular-nums text-foreground">{c.subtotal}</span>
            </p>
            <p className="mt-[0.4em] flex justify-between text-muted-foreground">
              <span>Delivery</span> <span className="text-foreground">Free</span>
            </p>
            <p className="mt-[0.8em] flex justify-between border-t border-border pt-[0.8em] font-bold">
              <span>Total</span> <span className="tabular-nums">{c.subtotal}</span>
            </p>
            <span className={`${button} mt-[1em] w-full rounded-control bg-accent py-[0.8em] text-accent-foreground`}>Proceed to checkout</span>
            <p className="mt-[0.7em] text-center text-[0.85em] text-accent">Continue shopping</p>
          </div>
        </div>
      </div>
    </>
  );
}

export const ClassicSpecimen = { home: Home, product: Product, cart: Cart } as const;
