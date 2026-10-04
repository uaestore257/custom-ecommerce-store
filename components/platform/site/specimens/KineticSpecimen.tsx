import { ArrowRight, Minus, Plus, Search, ShoppingBag, X } from "lucide-react";
import type { SpecimenCatalogue, SpecimenProduct } from "./catalogue";
import { FurniturePlate } from "./FurniturePlate";
import type { SpecimenViewProps } from "./types";

// A miniature of templates/kinetic at specimen scale (sizes in em of the
// specimen's base size). Mirrors the template's structure: compact bar over
// a category chip rail, an accent colour block beside a product-led hero
// with its add-to-cart, square hard-edged cards with quick add, a facts
// strip and buy column on the product page, and the cart as a bottom sheet
// (phone frames) or end drawer (wide frames). Breakpoints are container
// queries (@xl), as in the other specimens.

const eyebrow = "text-[0.66em] font-bold uppercase tracking-[0.12em] rtl:tracking-normal";
const container = "px-[1.4em] @xl:px-[2.2em]";
const icon = "h-[1.2em] w-[1.2em]";
const frame = "border-[2px] border-foreground";
const accentButton = `inline-flex items-center justify-center gap-[0.5em] ${frame} rounded-control bg-accent font-bold text-accent-foreground`;

function Header({ c, active = 0 }: { c: SpecimenCatalogue; active?: number }) {
  return (
    <div className="border-b-[2px] border-foreground">
      <div className={`flex h-[3.4em] items-center gap-[1em] ${container}`}>
        <span className="truncate font-heading text-[1.3em] font-extrabold tracking-tight rtl:tracking-normal">{c.storeName}</span>
        <span className="ms-auto hidden gap-[1.6em] text-[0.8em] font-semibold @xl:flex">
          <span className="underline decoration-2 underline-offset-[0.4em]">Shop</span>
          <span>About</span>
          <span>Contact</span>
        </span>
        <span className="ms-auto flex items-center gap-[0.8em] @xl:ms-[1em]">
          <Search className={icon} aria-hidden />
          <span className={`${accentButton} h-[2.4em] px-[0.8em] text-[0.8em]`}>
            <ShoppingBag className="h-[1em] w-[1em]" aria-hidden /> 2
          </span>
        </span>
      </div>
      <div className={`flex gap-[0.5em] overflow-hidden border-t border-border py-[0.6em] ${container}`}>
        {["All products", ...c.categories.map((category) => category.name)].map((name, index) => (
          <span
            key={name}
            className={`shrink-0 whitespace-nowrap rounded-control border-[2px] px-[0.9em] py-[0.35em] text-[0.72em] font-semibold ${
              index === active ? "border-foreground bg-foreground text-background" : "border-border bg-surface"
            }`}
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}

function Card({ product }: { product: SpecimenProduct }) {
  return (
    <div className={`min-w-0 overflow-hidden rounded-card ${frame} bg-surface`}>
      <div className="border-b-[2px] border-foreground bg-accent/10">
        <FurniturePlate kind={product.plate} ratio="1:1" className="aspect-square w-full" />
      </div>
      <div className="px-[0.8em] py-[0.7em]">
        <p className="truncate text-[0.6em] font-bold uppercase tracking-[0.1em] text-muted-foreground rtl:tracking-normal">{product.category}</p>
        <p className="mt-[0.2em] truncate font-heading text-[0.95em] font-bold">{product.name}</p>
        <p className="mt-[0.3em] text-[0.85em] font-extrabold tabular-nums">{product.price}</p>
      </div>
      <p className="flex h-[2.6em] items-center justify-center gap-[0.4em] border-t-[2px] border-foreground text-[0.75em] font-bold">
        <ShoppingBag className="h-[1em] w-[1em]" aria-hidden /> Add to cart
      </p>
    </div>
  );
}

function Home({ catalogue: c }: SpecimenViewProps) {
  const [hero, ...rest] = c.products;
  return (
    <>
      <Header c={c} />
      <div className="grid border-b-[2px] border-foreground @xl:grid-cols-12">
        <div className={`flex flex-col justify-center bg-accent py-[2.4em] text-accent-foreground @xl:col-span-7 ${container}`}>
          <p className={eyebrow}>{c.tagline}</p>
          <p className="mt-[0.6em] font-heading text-[2.5em] font-extrabold leading-[0.98] tracking-tight @xl:text-[3em] rtl:tracking-normal">{c.heroTitle}</p>
          <p className="mt-[1em] max-w-[30em] text-[0.88em] leading-relaxed opacity-80">{c.heroText}</p>
          <span className={`mt-[1.4em] inline-flex w-fit items-center gap-[0.5em] rounded-control ${frame} bg-foreground px-[1.2em] py-[0.7em] text-[0.8em] font-bold text-background`}>
            Shop all products <ArrowRight className="h-[1em] w-[1em] rtl:rotate-180" aria-hidden />
          </span>
        </div>
        <div className={`hidden border-s-[2px] border-foreground bg-surface py-[1.8em] @xl:col-span-5 @xl:block ${container}`}>
          <p className={`${eyebrow} text-muted-foreground`}>Featured product</p>
          <div className={`mt-[0.8em] overflow-hidden rounded-card ${frame} bg-accent/10`}>
            <FurniturePlate kind={hero.plate} ratio="16:10" className="aspect-[4/3] w-full" />
          </div>
          <p className="mt-[0.8em] font-heading text-[1.4em] font-extrabold leading-tight">{hero.name}</p>
          <p className="mt-[0.2em] text-[1em] font-extrabold tabular-nums">{hero.price}</p>
          <span className={`${accentButton} mt-[0.9em] h-[3em] w-full text-[0.8em]`}>Add to cart</span>
        </div>
      </div>
      <div className={`py-[2em] ${container}`}>
        <p className="font-heading text-[1.6em] font-extrabold tracking-tight rtl:tracking-normal">Featured</p>
        <div className="mt-[1em] grid grid-cols-2 gap-[0.8em] @xl:grid-cols-4">
          {rest.slice(0, 4).map((product) => (
            <Card key={product.name} product={product} />
          ))}
        </div>
      </div>
    </>
  );
}

function Product({ catalogue: c }: SpecimenViewProps) {
  const product = c.products[0];
  const facts: [string, string][] = [
    ["Delivery", c.delivery],
    ["Fulfilment", "Delivery or pickup"],
    ["Availability", "In stock"],
  ];
  return (
    <>
      <Header c={c} active={1} />
      <p className={`pt-[1em] text-[0.7em] text-muted-foreground ${container}`}>
        Shop <span aria-hidden>/</span> {product.category} <span aria-hidden>/</span> <span className="text-foreground">{product.name}</span>
      </p>
      <div className={`grid gap-[1.6em] pb-[2.4em] pt-[1em] @xl:grid-cols-12 ${container}`}>
        <div className="@xl:col-span-7">
          <div className={`overflow-hidden rounded-card ${frame} bg-accent/10`}>
            <FurniturePlate kind="sofa" ratio="1:1" className="aspect-square w-full" />
          </div>
          <div className="mt-[0.6em] flex gap-[0.4em]">
            {(["sofa", "armchair", "table"] as const).map((kind, index) => (
              <div key={kind} className={`w-[4em] overflow-hidden rounded-control border-[2px] bg-accent/10 ${index === 0 ? "border-foreground" : "border-border"}`}>
                <FurniturePlate kind={kind} ratio="1:1" className="aspect-square w-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="@xl:col-span-5">
          <p className={`${eyebrow} text-muted-foreground`}>{product.category}</p>
          <p className="mt-[0.3em] font-heading text-[2.2em] font-extrabold leading-[1.02] tracking-tight rtl:tracking-normal">{product.name}</p>
          <p className="mt-[0.5em] text-[1.3em] font-extrabold tabular-nums">{product.price}</p>
          <div className={`mt-[1em] grid grid-cols-3 gap-[2px] overflow-hidden rounded-card ${frame} bg-foreground`}>
            {facts.map(([label, value]) => (
              <div key={label} className="min-w-0 bg-surface px-[0.6em] py-[0.6em]">
                <p className="text-[0.58em] font-bold uppercase tracking-[0.08em] text-muted-foreground rtl:tracking-normal">{label}</p>
                <p className="mt-[0.2em] truncate text-[0.75em] font-bold">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-[1em] flex gap-[0.5em]">
            <span className={`inline-flex h-[3em] items-center gap-[0.9em] rounded-control ${frame} px-[0.8em] text-[0.8em] font-bold tabular-nums`}>
              <Minus className="h-[1em] w-[1em]" aria-hidden /> 1 <Plus className="h-[1em] w-[1em]" aria-hidden />
            </span>
            <span className={`${accentButton} h-[3em] flex-1 text-[0.8em]`}>Add to cart</span>
          </div>
          <p className="mt-[1.2em] border-t-[2px] border-foreground pt-[0.9em] text-[0.82em] leading-relaxed text-muted-foreground">{c.description}</p>
        </div>
      </div>
      <div className={`absolute inset-x-0 bottom-0 flex items-center gap-[1em] border-t-[2px] border-foreground bg-background py-[0.7em] ${container}`}>
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-[0.9em] font-bold">{product.name}</p>
          <p className="text-[0.75em] tabular-nums text-muted-foreground">{product.price}</p>
        </div>
        <span className={`${accentButton} h-[2.8em] px-[1.4em] text-[0.75em]`}>Add to cart</span>
      </div>
    </>
  );
}

function Cart(props: SpecimenViewProps) {
  const c = props.catalogue;
  return (
    <div className="relative">
      <Home {...props} />
      <div className="absolute inset-0 bg-foreground/40" />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[85%] flex-col border-t-[2px] border-foreground bg-surface-elevated @xl:inset-x-auto @xl:inset-y-0 @xl:end-0 @xl:max-h-none @xl:w-[44%] @xl:border-s-[2px] @xl:border-t-0">
        <span aria-hidden className="mx-auto mt-[0.5em] h-[0.35em] w-[3em] rounded-full bg-border @xl:hidden" />
        <div className="flex items-center justify-between border-b-[2px] border-foreground px-[1.4em] py-[0.9em]">
          <p className="font-heading text-[1.2em] font-extrabold">
            Your cart <span className="text-muted-foreground">(2)</span>
          </p>
          <span className={`flex h-[2.2em] w-[2.2em] items-center justify-center rounded-control ${frame}`}>
            <X className="h-[1em] w-[1em]" aria-hidden />
          </span>
        </div>
        <ul className="flex-1 space-y-[0.7em] px-[1.4em] py-[1em]">
          {c.products.slice(0, 2).map((product) => (
            <li key={product.name} className={`flex gap-[0.8em] ${frame} bg-surface p-[0.5em]`}>
              <div className="w-[4em] shrink-0 bg-accent/10">
                <FurniturePlate kind={product.plate} ratio="1:1" className="aspect-square w-full" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex justify-between gap-[0.6em]">
                  <span className="truncate font-heading text-[0.9em] font-bold">{product.name}</span>
                  <span className="shrink-0 text-[0.8em] font-bold tabular-nums">{product.price}</span>
                </p>
                <span className="mt-[0.5em] inline-flex items-center gap-[0.8em] rounded-control border-[2px] border-border px-[0.6em] py-[0.2em] text-[0.75em] tabular-nums">
                  <Minus className="h-[1em] w-[1em]" aria-hidden /> 1 <Plus className="h-[1em] w-[1em]" aria-hidden />
                </span>
              </div>
            </li>
          ))}
        </ul>
        <div className="border-t-[2px] border-foreground px-[1.4em] py-[1em]">
          <p className="flex justify-between text-[0.9em] font-bold">
            <span>Subtotal</span> <span className="tabular-nums">{c.subtotal}</span>
          </p>
          <span className={`${accentButton} mt-[0.8em] h-[3em] w-full text-[0.8em]`}>Checkout</span>
        </div>
      </div>
    </div>
  );
}

function ProductWithBar(props: SpecimenViewProps) {
  return (
    <div className="relative">
      <Product {...props} />
    </div>
  );
}

export const KineticSpecimen = { home: Home, product: ProductWithBar, cart: Cart } as const;
