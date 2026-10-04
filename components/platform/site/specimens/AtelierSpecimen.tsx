import { ArrowRight, Menu, Minus, Plus, X } from "lucide-react";
import type { SpecimenCatalogue, SpecimenProduct } from "./catalogue";
import { FurniturePlate } from "./FurniturePlate";
import type { SpecimenViewProps } from "./types";

// A miniature of templates/atelier at specimen scale (sizes in em of the
// specimen's base size). Mirrors the template's structure: editorial split
// header, split hero, numbered collection index, frameless 4:5 cards, a
// gallery beside a sticky purchase panel, and the inline-end cart drawer.
// Breakpoints are container queries (@xl), so a specimen lays itself out
// for the frame it sits in, exactly as the template does for a viewport.

const eyebrow = "text-[0.72em] font-medium uppercase tracking-[0.24em] text-muted-foreground rtl:tracking-normal";
const nav = "text-[0.7em] uppercase tracking-[0.2em] rtl:tracking-normal";
const container = "px-[1.6em] @xl:px-[2.4em]";
const icon = "h-[1.3em] w-[1.3em]";

function Header({ c }: { c: SpecimenCatalogue }) {
  return (
    <div className={`grid h-[3.8em] grid-cols-[1fr_auto_1fr] items-center gap-[1em] border-b border-border ${container}`}>
      <div className="flex items-center gap-[1.8em]">
        <Menu className={`${icon} @xl:hidden`} aria-hidden />
        <span className={`hidden @xl:inline ${nav}`}>Collections</span>
        <span className={`hidden @xl:inline ${nav}`}>All pieces</span>
        <span className={`hidden @2xl:inline ${nav}`}>Atelier</span>
      </div>
      <span className="truncate font-heading text-[1.1em] font-medium uppercase tracking-[0.16em] @xl:text-[1.45em] @xl:tracking-[0.28em] rtl:tracking-normal">
        {c.storeName}
      </span>
      <div className="flex items-center justify-end gap-[1.8em]">
        <span className={`hidden @2xl:inline ${nav}`}>Search</span>
        <span className={`hidden @xl:inline ${nav}`}>Contact</span>
        <span className={nav}>Bag (2)</span>
      </div>
    </div>
  );
}

function Card({ product, feature = false }: { product: SpecimenProduct; feature?: boolean }) {
  return (
    <div className="min-w-0">
      <FurniturePlate kind={product.plate} className="aspect-[4/5] w-full" />
      <div className="mt-[0.9em] flex flex-wrap items-start justify-between gap-x-[1em] gap-y-[0.2em]">
        <div className="min-w-0">
          <p className="text-[0.62em] uppercase tracking-[0.2em] text-muted-foreground rtl:tracking-normal">{product.category}</p>
          <p className={`mt-[0.2em] font-heading leading-tight ${feature ? "text-[1.7em]" : "text-[1.2em]"}`}>{product.name}</p>
        </div>
        <p className="pt-[0.2em] text-[0.8em] tabular-nums whitespace-nowrap">{product.price}</p>
      </div>
    </div>
  );
}

function Home({ catalogue: c }: SpecimenViewProps) {
  const [lead, second, third] = c.products;
  return (
    <>
      <Header c={c} />
      <div className="grid @xl:min-h-[27em] @xl:grid-cols-12">
        <div className={`order-2 flex flex-col justify-end py-[2.4em] @xl:order-1 @xl:col-span-5 ${container}`}>
          <p className={eyebrow}>{c.tagline}</p>
          <p className="mt-[0.7em] font-heading text-[2.5em] leading-[1.04] tracking-tight @xl:text-[3.2em] rtl:tracking-normal">{c.heroTitle}</p>
          <p className="mt-[1.3em] max-w-[28em] text-[0.92em] leading-relaxed text-muted-foreground">{c.heroText}</p>
          <span className="mt-[1.6em] inline-flex items-center gap-[0.5em] text-[0.88em] underline decoration-border underline-offset-[0.45em]">
            Explore the collection <ArrowRight className="h-[1em] w-[1em] rtl:rotate-180" aria-hidden />
          </span>
        </div>
        <div className="relative order-1 @xl:order-2 @xl:col-span-7">
          <FurniturePlate kind="sofa" arch className="aspect-[4/5] w-full @xl:absolute @xl:inset-0 @xl:aspect-auto @xl:h-full" />
        </div>
      </div>

      <div className={`grid gap-[1.6em] border-t border-border py-[2.6em] @xl:grid-cols-12 ${container}`}>
        <div className="@xl:col-span-4">
          <p className={eyebrow}>Index</p>
          <p className="mt-[0.5em] font-heading text-[2em] leading-tight">The collection</p>
        </div>
        <ol className="@xl:col-span-8">
          {c.categories.map((category, index) => (
            <li key={category.name} className="grid grid-cols-[2.4em_1fr_auto] items-center gap-[1em] border-t border-border py-[0.9em] last:border-b @xl:grid-cols-[2.8em_1fr_auto_3.2em]">
              <span className="text-[0.7em] tabular-nums text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
              <span className="truncate font-heading text-[1.7em]">{category.name}</span>
              <span className="text-[0.7em] text-muted-foreground">
                {category.count} {category.count === 1 ? "piece" : "pieces"}
              </span>
              <FurniturePlate kind={category.plate} className="hidden aspect-[4/5] w-full @xl:block" />
            </li>
          ))}
        </ol>
      </div>

      <div className={`border-t border-border bg-surface py-[2.6em] ${container}`}>
        <p className={eyebrow}>Featured</p>
        <p className="mt-[0.5em] font-heading text-[2em] leading-tight">Selected pieces</p>
        <div className="mt-[1.8em] grid grid-cols-2 gap-x-[1em] gap-y-[2em] @xl:grid-cols-12 @xl:gap-x-[1.4em]">
          <div className="col-span-2 @xl:col-span-6 @xl:row-span-2">
            <Card product={lead} feature />
          </div>
          <div className="@xl:col-span-3">
            <Card product={second} />
          </div>
          <div className="@xl:col-span-3">
            <Card product={third} />
          </div>
        </div>
      </div>
    </>
  );
}

function Quantity() {
  return (
    <span className="inline-flex h-[3.4em] items-center gap-[1.1em] border border-border px-[1em] text-[0.85em] tabular-nums">
      <Minus className="h-[1em] w-[1em]" aria-hidden /> 1 <Plus className="h-[1em] w-[1em]" aria-hidden />
    </span>
  );
}

function Product({ catalogue: c }: SpecimenViewProps) {
  const product = c.products[0];
  return (
    <>
      <Header c={c} />
      <p className={`pt-[1.2em] text-[0.7em] text-muted-foreground ${container}`}>
        All pieces <span aria-hidden>/</span> {product.category} <span aria-hidden>/</span> <span className="text-foreground">{product.name}</span>
      </p>
      <div className={`grid gap-[2em] pb-[2.4em] pt-[1.2em] @xl:grid-cols-12 ${container}`}>
        <div className="flex gap-[0.4em] overflow-hidden @xl:col-span-7 @xl:flex-col">
          <FurniturePlate kind="sofa" arch className="aspect-[4/5] w-[84%] shrink-0 @xl:w-full" />
          <FurniturePlate kind="armchair" className="aspect-[4/5] w-[84%] shrink-0 @xl:w-full" />
        </div>
        <div className="@xl:col-span-5">
          <p className={eyebrow}>{product.category}</p>
          <p className="mt-[0.6em] font-heading text-[2.3em] leading-tight">{product.name}</p>
          <p className="mt-[0.8em] text-[1.05em] tabular-nums">{product.price}</p>
          <p className="mt-[0.3em] text-[0.75em] text-muted-foreground">Available</p>
          <p className="mt-[1.4em] text-[0.88em] leading-relaxed text-muted-foreground">{c.description}</p>
          <div className="mt-[1.6em] flex gap-[0.6em]">
            <Quantity />
            <span className="inline-flex h-[2.9em] flex-1 items-center justify-center bg-foreground text-[0.72em] font-medium uppercase tracking-[0.2em] text-background rtl:tracking-normal">
              Add to bag
            </span>
          </div>
          <ul className="mt-[1.8em] text-[0.85em]">
            {["Dimensions", "Delivery", "Care"].map((label) => (
              <li key={label} className="flex items-center justify-between border-t border-border py-[0.9em] last:border-b">
                {label} <Plus className="h-[1em] w-[1em]" aria-hidden />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

function Cart(props: SpecimenViewProps) {
  const c = props.catalogue;
  return (
    <div className="relative">
      <Home {...props} />
      <div className="absolute inset-0 bg-foreground/30" />
      <div className="absolute inset-y-0 end-0 flex w-[84%] flex-col bg-surface-elevated shadow-2xl @xl:w-[44%]">
        <div className="flex items-center justify-between border-b border-border px-[1.6em] py-[1.2em]">
          <p className={eyebrow}>Your bag · 2</p>
          <X className={icon} aria-hidden />
        </div>
        <ul className="flex-1 px-[1.6em]">
          {c.products.slice(0, 2).map((product) => (
            <li key={product.name} className="grid grid-cols-[4.6em_1fr] gap-[1em] border-b border-border py-[1.2em]">
              <FurniturePlate kind={product.plate} className="aspect-[4/5] w-full" />
              <div className="min-w-0">
                <p className="font-heading text-[1.2em] leading-tight">{product.name}</p>
                <p className="mt-[0.3em] text-[0.8em] tabular-nums">{product.price}</p>
                <p className="mt-[0.8em] flex items-center gap-[1em] text-[0.75em] text-muted-foreground">
                  <span className="inline-flex items-center gap-[0.8em] border border-border px-[0.7em] py-[0.3em] text-foreground">
                    <Minus className="h-[1em] w-[1em]" aria-hidden /> 1 <Plus className="h-[1em] w-[1em]" aria-hidden />
                  </span>
                  <span className="underline underline-offset-[0.3em]">Remove</span>
                </p>
              </div>
            </li>
          ))}
        </ul>
        <div className="border-t border-border px-[1.6em] py-[1.4em]">
          <p className="flex justify-between text-[0.85em]">
            <span>Subtotal</span> <span className="tabular-nums">{c.subtotal}</span>
          </p>
          <p className="mt-[0.4em] text-[0.7em] text-muted-foreground">Delivery is confirmed at checkout.</p>
          <span className="mt-[1em] flex h-[3.2em] items-center justify-center bg-foreground text-[0.72em] font-medium uppercase tracking-[0.2em] text-background rtl:tracking-normal">
            Checkout
          </span>
          <p className="mt-[0.9em] text-center text-[0.75em] underline underline-offset-[0.35em]">View bag</p>
        </div>
      </div>
    </div>
  );
}

export const AtelierSpecimen = { home: Home, product: Product, cart: Cart } as const;
