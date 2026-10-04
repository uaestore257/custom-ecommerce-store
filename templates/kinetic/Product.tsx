import { SfBreadcrumbs } from "@/components/storefront/primitives";
import { formatStoreMoney, isProductOnSale, productDeliveryDescription } from "@/lib/storefront-cart";
import { categoryPath } from "@/lib/storefront-urls";
import type { TemplateProductProps } from "../types";
import { KineticGallery } from "./Gallery";
import { KINETIC_GRID, KineticProductCard } from "./ProductCard";
import { KineticPurchase } from "./Purchase";
import { KineticStickyBuyBar } from "./StickyBuyBar";
import { KINETIC_CONTAINER, kineticEyebrow } from "./styles";

const PURCHASE_ID = "kinetic-purchase";

/**
 * Product page: a square gallery with a thumbnail rail beside the buy
 * column — name, price, a facts strip built only from real product data
 * (delivery, fulfilment, availability), the shared purchase control — and
 * a sticky buy bar once that control scrolls out of view.
 */
export function KineticProduct({ store, product, category, related }: TemplateProductProps) {
  const onSale = isProductOnSale(product);
  const images = product.images.length > 0 ? product.images : [{ url: product.imageUrl, alt: "" }];
  const inStock = product.stock > 0;
  const facts = [
    { label: "Delivery", value: product.pickupOnly ? "Not delivered" : product.freeDelivery ? "Free" : formatStoreMoney(store, product.deliveryFeeMinor) },
    { label: "Fulfilment", value: product.pickupOnly ? "Pickup only" : "Delivery or pickup" },
    { label: "Availability", value: !inStock ? "Sold out" : product.stock <= 5 ? `Only ${product.stock} left` : "In stock" },
  ];

  return (
    <main className={inStock ? "pb-24" : ""}>
      <div className={`${KINETIC_CONTAINER} pt-5`}>
        <SfBreadcrumbs
          items={[
            { label: "Shop", href: "/shop" },
            ...(category ? [{ label: category.name, href: categoryPath(category) }] : []),
            { label: product.name },
          ]}
        />
      </div>

      <div className={`${KINETIC_CONTAINER} grid gap-8 pb-14 pt-5 lg:grid-cols-12 lg:gap-12`}>
        <section aria-label={`${product.name} images`} className="lg:col-span-7">
          <KineticGallery images={images} name={product.name} />
        </section>

        <section aria-label="Purchase" className="lg:col-span-5">
          <div className="lg:sticky lg:top-36">
            {category && <p className={`${kineticEyebrow} text-muted-foreground`}>{category.name}</p>}
            <h1 className="mt-2 font-heading text-4xl font-extrabold leading-[1.02] tracking-tight sm:text-5xl rtl:tracking-normal">{product.name}</h1>
            <p className="mt-4 flex flex-wrap items-baseline gap-x-3 tabular-nums">
              <span className="text-2xl font-extrabold">
                {onSale && <span className="sr-only">Sale price </span>}
                {formatStoreMoney(store, product.priceMinor)}
              </span>
              {onSale && product.compareAtMinor && (
                <span className="text-base text-muted-foreground line-through">
                  <span className="sr-only">Original price </span>
                  {formatStoreMoney(store, product.compareAtMinor)}
                </span>
              )}
              {onSale && <span className="rounded-control border-2 border-foreground bg-accent px-2 py-0.5 text-xs font-bold uppercase text-accent-foreground">Sale</span>}
            </p>

            <dl className="mt-6 grid grid-cols-3 gap-[2px] overflow-hidden rounded-card border-2 border-foreground bg-foreground">
              {facts.map((fact) => (
                <div key={fact.label} className="min-w-0 bg-surface px-3 py-3">
                  <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground rtl:tracking-normal">{fact.label}</dt>
                  <dd className="mt-1 text-sm font-bold leading-snug">{fact.value}</dd>
                </div>
              ))}
            </dl>

            <div id={PURCHASE_ID} className="mt-6">
              {inStock ? (
                <>
                  <KineticPurchase product={product} shownStoreId={store.id} />
                  <p className="mt-3 text-xs text-muted-foreground">Items are not reserved while in your cart.</p>
                </>
              ) : (
                <p className="rounded-card border-2 border-foreground bg-muted px-4 py-3 text-sm font-bold">Sold out — check back soon.</p>
              )}
            </div>

            {product.description && (
              <div className="mt-8 border-t-2 border-foreground pt-6">
                <h2 className={kineticEyebrow}>Details</h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{product.description}</p>
              </div>
            )}
            <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
              <dt className="text-muted-foreground">SKU</dt>
              <dd className="font-semibold">{product.sku}</dd>
              <dt className="text-muted-foreground">Delivery</dt>
              <dd className="font-semibold">{productDeliveryDescription(product, store)}</dd>
            </dl>
          </div>
        </section>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="kinetic-related" className="border-t-2 border-foreground bg-muted py-12 lg:py-16">
          <div className={KINETIC_CONTAINER}>
            <h2 id="kinetic-related" className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl rtl:tracking-normal">You might also like</h2>
            <ul className={`mt-6 ${KINETIC_GRID}`}>
              {related.map((item) => (
                <li key={item.id} className="min-w-0">
                  <KineticProductCard product={item} store={store} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {inStock && <KineticStickyBuyBar product={product} store={store} targetId={PURCHASE_ID} />}
    </main>
  );
}
