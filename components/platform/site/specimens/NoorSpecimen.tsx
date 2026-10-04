import { Menu, Minus, Plus, Search, ShoppingBag } from "lucide-react";
import type { SpecimenCatalogue, SpecimenProduct } from "./catalogue";
import { FurniturePlate } from "./FurniturePlate";
import type { SpecimenViewProps } from "./types";

// A miniature of templates/noor at specimen scale (sizes in em of the
// specimen's base size). Mirrors the template's structure: the centred
// stack (search · wordmark · cart over a centred navigation row), the
// arcade hero of arched frames under a centred headline, arched 3:4
// product cards with centred name and price, and the arched gallery
// beside the purchase column. Interface labels follow the specimen's
// direction the way Noor's do: Arabic in the RTL edition, English in LTR.
// Container queries (@xl), as in the other specimens.

const container = "px-[1.4em] @xl:px-[2.4em]";
const frame = "rounded-t-full border border-border p-[0.3em]";
const arch = "overflow-hidden rounded-t-full bg-muted";

function labels(c: SpecimenCatalogue) {
  const ar = c.locale.startsWith("ar");
  return ar
    ? { nav: ["جميع المنتجات", ...c.categories.slice(0, 3).map((x) => x.name), "من نحن"], shop: "تسوّق المجموعة", story: "قصتنا", featured: "قطع مختارة", add: "أضف إلى السلة", cart: "سلة التسوق", checkout: "إتمام الطلب", subtotal: "المجموع الفرعي", stock: "متوفر" }
    : { nav: ["All products", ...c.categories.slice(0, 3).map((x) => x.name), "About"], shop: "Shop the collection", story: "Our story", featured: "Featured pieces", add: "Add to cart", cart: "Your cart", checkout: "Checkout", subtotal: "Subtotal", stock: "In stock" };
}

function Ornament() {
  return (
    <span aria-hidden className="flex items-center justify-center gap-[0.8em] text-border">
      <span className="h-px w-[3em] bg-current" />
      <svg viewBox="0 0 24 24" className="h-[0.9em] w-[0.9em] text-accent" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="5" y="5" width="14" height="14" />
        <rect x="5" y="5" width="14" height="14" transform="rotate(45 12 12)" />
      </svg>
      <span className="h-px w-[3em] bg-current" />
    </span>
  );
}

function Header({ c }: { c: SpecimenCatalogue }) {
  const l = labels(c);
  return (
    <div className="border-b border-border">
      <div className={`grid h-[3.6em] grid-cols-[1fr_auto_1fr] items-center ${container}`}>
        <span className="flex items-center gap-[0.8em]">
          <Menu className="h-[1.2em] w-[1.2em] @xl:hidden" aria-hidden />
          <Search className="h-[1.2em] w-[1.2em]" aria-hidden />
        </span>
        <span className="truncate font-heading text-[1.5em]">{c.storeName}</span>
        <span className="flex justify-end">
          <ShoppingBag className="h-[1.2em] w-[1.2em]" aria-hidden />
        </span>
      </div>
      <div className="hidden justify-center gap-[2em] border-t border-border py-[0.7em] text-[0.75em] @xl:flex">
        {l.nav.map((item, index) => (
          <span key={item} className={index === 0 ? "text-accent" : ""}>{item}</span>
        ))}
      </div>
    </div>
  );
}

function Card({ product, add }: { product: SpecimenProduct; add: string }) {
  return (
    <div className="min-w-0 text-center">
      <div className={frame}>
        <div className={arch}>
          <FurniturePlate kind={product.plate} className="aspect-[3/4] w-full" />
        </div>
      </div>
      <p className="mt-[0.8em] truncate font-heading text-[1em]">{product.name}</p>
      <p className="mt-[0.2em] text-[0.75em] tabular-nums">{product.price}</p>
      <span className="mt-[0.6em] flex h-[2.4em] items-center justify-center rounded-full border border-border text-[0.68em]">{add}</span>
    </div>
  );
}

function Home({ catalogue: c }: SpecimenViewProps) {
  const l = labels(c);
  return (
    <>
      <Header c={c} />
      <div className={`pt-[2.2em] text-center ${container}`}>
        <p className="text-[0.62em] tracking-[0.18em] text-muted-foreground uppercase rtl:tracking-normal">{c.tagline}</p>
        <p className="mx-auto mt-[0.6em] max-w-[18em] font-heading text-[2.3em] leading-[1.15]">{c.heroTitle}</p>
        <div className="mt-[1.2em] flex justify-center gap-[0.6em] text-[0.72em]">
          <span className="rounded-full bg-foreground px-[1.4em] py-[0.8em] text-background">{l.shop}</span>
          <span className="rounded-full border border-foreground/30 px-[1.4em] py-[0.8em]">{l.story}</span>
        </div>
      </div>
      <div className={`mt-[1.8em] grid grid-cols-[1fr_minmax(0,11em)_1fr] items-end gap-[1em] ${container}`}>
        <div className={`${frame} hidden translate-y-[1em] @xl:block`}>
          <div className={arch}>
            <FurniturePlate kind="lamp" className="aspect-[3/4] w-full" />
          </div>
        </div>
        <div className={frame}>
          <div className={arch}>
            <FurniturePlate kind="armchair" className="aspect-[3/4] w-full" />
          </div>
        </div>
        <div className={`${frame} hidden translate-y-[1em] @xl:block`}>
          <div className={arch}>
            <FurniturePlate kind="shelf" className="aspect-[3/4] w-full" />
          </div>
        </div>
      </div>
      <div className={`border-t border-border bg-surface py-[2em] text-center ${container}`}>
        <p className="font-heading text-[1.6em]">{l.featured}</p>
        <div className="mt-[0.6em]"><Ornament /></div>
        <div className="mt-[1.4em] grid grid-cols-2 gap-x-[1em] gap-y-[1.6em] @xl:grid-cols-4">
          {c.products.slice(0, 4).map((product) => (
            <Card key={product.name} product={product} add={l.add} />
          ))}
        </div>
      </div>
    </>
  );
}

function Product({ catalogue: c }: SpecimenViewProps) {
  const l = labels(c);
  const product = c.products[0];
  return (
    <>
      <Header c={c} />
      <div className={`grid gap-[1.8em] py-[1.8em] @xl:grid-cols-2 ${container}`}>
        <div className="mx-auto w-full max-w-[16em]">
          <div className={frame}>
            <div className={arch}>
              <FurniturePlate kind="sofa" className="aspect-[3/4] w-full" />
            </div>
          </div>
          <div className="mt-[0.8em] flex justify-center gap-[0.5em]">
            {(["sofa", "armchair", "table"] as const).map((kind, index) => (
              <div key={kind} className={`w-[2.6em] rounded-t-full border p-[0.15em] ${index === 0 ? "border-foreground" : "border-border"}`}>
                <div className={arch}>
                  <FurniturePlate kind={kind} className="aspect-[3/4] w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-center @xl:pt-[1.4em] @xl:text-start">
          <p className="text-[0.62em] tracking-[0.18em] text-muted-foreground uppercase rtl:tracking-normal">{product.category}</p>
          <p className="mt-[0.4em] font-heading text-[2em] leading-tight">{product.name}</p>
          <p className="mt-[0.6em] text-[1.1em] tabular-nums">{product.price}</p>
          <span className="mt-[0.6em] inline-flex rounded-full border border-border px-[0.9em] py-[0.25em] text-[0.62em]">{l.stock}</span>
          <div className="mt-[1.2em] flex gap-[0.5em]">
            <span className="inline-flex h-[3em] items-center gap-[0.9em] rounded-full border border-border px-[0.9em] text-[0.75em] tabular-nums">
              <Minus className="h-[1em] w-[1em]" aria-hidden /> 1 <Plus className="h-[1em] w-[1em]" aria-hidden />
            </span>
            <span className="flex h-[3em] flex-1 items-center justify-center rounded-full bg-accent text-[0.75em] text-accent-foreground">{l.add}</span>
          </div>
          <p className="mt-[1.2em] border-t border-border pt-[0.9em] text-start text-[0.78em] leading-relaxed text-muted-foreground">{c.description}</p>
        </div>
      </div>
    </>
  );
}

function Cart({ catalogue: c }: SpecimenViewProps) {
  const l = labels(c);
  return (
    <>
      <Header c={c} />
      <div className={`py-[1.8em] ${container}`}>
        <p className="text-center font-heading text-[1.8em]">{l.cart}</p>
        <div className="mt-[0.6em]"><Ornament /></div>
        <div className="mt-[1.4em] grid gap-[1.4em] @xl:grid-cols-[1fr_15em]">
          <ul className="divide-y divide-border border-y border-border">
            {c.products.slice(0, 2).map((product) => (
              <li key={product.name} className="grid grid-cols-[3.4em_1fr_auto] items-center gap-[1em] py-[0.9em]">
                <div className={frame}>
                  <div className={arch}>
                    <FurniturePlate kind={product.plate} className="aspect-[3/4] w-full" />
                  </div>
                </div>
                <p className="truncate font-heading text-[0.95em]">{product.name}</p>
                <p className="text-[0.8em] tabular-nums">{product.price}</p>
              </li>
            ))}
          </ul>
          <div className="h-fit rounded-t-[2em] border border-border bg-surface p-[1.2em] text-center">
            <p className="flex justify-between text-[0.8em]">
              <span>{l.subtotal}</span> <span className="tabular-nums">{c.subtotal}</span>
            </p>
            <span className="mt-[1em] flex h-[3em] items-center justify-center rounded-full bg-accent text-[0.75em] text-accent-foreground">{l.checkout}</span>
          </div>
        </div>
      </div>
    </>
  );
}

export const NoorSpecimen = { home: Home, product: Product, cart: Cart } as const;
