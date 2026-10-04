import { X } from "lucide-react";
import type { SpecimenCatalogue, SpecimenProduct } from "./catalogue";
import { FurniturePlate } from "./FurniturePlate";
import type { SpecimenViewProps } from "./types";

// A miniature of templates/maison at specimen scale (sizes in em of the
// specimen's base size). Mirrors the template's structure: "Menu", a
// centred tracked wordmark and "Bag" floating over a full-bleed ink
// campaign field, tall campaign tiles, frameless 2:3 cards, the product
// gallery beside a quiet purchase column with disclosures, and the
// full-height bag drawer. Breakpoints are container queries (@xl).

const label = "text-[0.62em] font-medium uppercase tracking-[0.22em] rtl:tracking-normal";
const container = "px-[1.6em] @xl:px-[2.6em]";
const campaign = "bg-[#0c0b0a] text-[#f4efe6]";

function Header({ c, overHero = false }: { c: SpecimenCatalogue; overHero?: boolean }) {
  return (
    <div className={`grid h-[3.8em] grid-cols-[1fr_auto_1fr] items-center gap-[1em] ${container} ${overHero ? "text-[#f4efe6]" : "border-b border-border"}`}>
      <span className={label}>Menu</span>
      <span className="truncate font-heading text-[1.15em] font-medium uppercase tracking-[0.32em] @xl:text-[1.5em] @xl:tracking-[0.42em] rtl:tracking-normal">{c.storeName}</span>
      <span className={`justify-self-end ${label}`}>Bag (2)</span>
    </div>
  );
}

function Card({ product }: { product: SpecimenProduct }) {
  return (
    <div className="min-w-0">
      <div className="bg-muted">
        <FurniturePlate kind={product.plate} className="aspect-[2/3] w-full" />
      </div>
      <p className={`mt-[0.9em] truncate ${label}`}>{product.name}</p>
      <p className="mt-[0.2em] text-[0.78em] tabular-nums">{product.price}</p>
    </div>
  );
}

function Home({ catalogue: c }: SpecimenViewProps) {
  return (
    <>
      <div className={`relative flex min-h-[26em] flex-col ${campaign}`}>
        <Header c={c} overHero />
        <p aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center font-heading text-[5em] uppercase leading-none tracking-[0.04em] opacity-[0.08] rtl:tracking-normal">
          {c.storeName}
        </p>
        <div className={`relative mt-auto pb-[2.4em] ${container}`}>
          <p className={`${label} opacity-80`}>{c.tagline}</p>
          <p className="mt-[0.6em] max-w-[16em] font-heading text-[2.6em] leading-[1.02] @xl:text-[3.4em]">{c.heroTitle}</p>
          <p className={`mt-[1.4em] ${label} underline underline-offset-[0.6em]`}>Discover the collection</p>
        </div>
      </div>
      <div className={`pt-[2.4em] ${container}`}>
        <p className={`${label} text-muted-foreground`}>The collections</p>
        <div className="mt-[1em] grid grid-cols-2 gap-[0.6em]">
          {c.categories.slice(0, 2).map((category) => (
            <div key={category.name} className="relative overflow-hidden">
              <FurniturePlate kind={category.plate} className="aspect-[4/5] w-full" />
              <span className="absolute inset-0 bg-[linear-gradient(to_top,rgb(12_11_10/0.6),transparent_45%)]" />
              <span className="absolute inset-x-0 bottom-0 p-[1em] font-heading text-[1.4em] uppercase tracking-[0.12em] text-[#f4efe6] rtl:tracking-normal">{category.name}</span>
            </div>
          ))}
        </div>
      </div>
      <div className={`py-[2.4em] ${container}`}>
        <p className={`border-b border-border pb-[0.8em] ${label}`}>The edit</p>
        <div className="mt-[1.4em] grid grid-cols-2 gap-x-[0.8em] gap-y-[1.6em] @xl:grid-cols-4">
          {c.products.slice(0, 4).map((product) => (
            <Card key={product.name} product={product} />
          ))}
        </div>
      </div>
    </>
  );
}

function Product({ catalogue: c }: SpecimenViewProps) {
  const product = c.products[0];
  return (
    <>
      <Header c={c} />
      <div className="grid @xl:grid-cols-12">
        <div className="relative @xl:col-span-7">
          <div className="hidden grid-cols-2 gap-[0.3em] @xl:grid">
            <FurniturePlate kind="sofa" className="aspect-[2/3] w-full bg-muted" />
            <FurniturePlate kind="armchair" className="aspect-[2/3] w-full bg-muted" />
          </div>
          <div className="@xl:hidden">
            <FurniturePlate kind="sofa" className="aspect-[2/3] w-full bg-muted" />
            <span className="absolute bottom-[1em] end-[1em] bg-background/80 px-[0.6em] py-[0.2em] text-[0.62em] tracking-[0.2em] tabular-nums rtl:tracking-normal">1 / 3</span>
          </div>
        </div>
        <div className={`py-[2em] @xl:col-span-5 ${container}`}>
          <p className="text-[0.65em] text-muted-foreground">
            Collection <span aria-hidden>/</span> {product.category}
          </p>
          <p className="mt-[1em] font-heading text-[2.2em] leading-tight">{product.name}</p>
          <p className="mt-[0.6em] text-[0.9em] tabular-nums">{product.price}</p>
          <p className="mt-[0.3em] text-[0.65em] text-muted-foreground">Available</p>
          <span className={`mt-[1.6em] flex h-[3.2em] items-center justify-center bg-foreground text-background ${label}`}>Add to bag</span>
          <ul className="mt-[1.8em] border-y border-border">
            {["Description", "Delivery & collection", "Details"].map((item) => (
              <li key={item} className={`flex items-center justify-between border-t border-border py-[1em] first:border-t-0 ${label}`}>
                {item} <span aria-hidden className="text-[1.4em] font-light leading-none">+</span>
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
      <div className="absolute inset-0 bg-[#0c0b0a]/40" />
      <div className="absolute inset-y-0 end-0 flex w-[86%] flex-col border-s border-border bg-surface-elevated @xl:w-[42%]">
        <div className={`flex items-center justify-between border-b border-border py-[1.2em] ${container}`}>
          <p className={label}>Your bag (2)</p>
          <X className="h-[1.2em] w-[1.2em]" strokeWidth={1.25} aria-hidden />
        </div>
        <ul className={`flex-1 divide-y divide-border ${container}`}>
          {c.products.slice(0, 2).map((product) => (
            <li key={product.name} className="grid grid-cols-[4.4em_1fr] gap-[1em] py-[1.2em]">
              <FurniturePlate kind={product.plate} className="aspect-[2/3] w-full bg-muted" />
              <div className="min-w-0">
                <p className={`truncate ${label}`}>{product.name}</p>
                <p className="mt-[0.3em] text-[0.8em] tabular-nums">{product.price}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className={`border-t border-border py-[1.4em] ${container}`}>
          <p className="flex justify-between text-[0.8em]">
            <span className={label}>Subtotal</span> <span className="tabular-nums">{c.subtotal}</span>
          </p>
          <span className={`mt-[1em] flex h-[3.2em] items-center justify-center bg-foreground text-background ${label}`}>Checkout</span>
        </div>
      </div>
    </div>
  );
}

export const MaisonSpecimen = { home: Home, product: Product, cart: Cart } as const;
