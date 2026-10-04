import { ProductImage } from "@/components/ProductImage";
import { SfBreadcrumbs } from "@/components/storefront/primitives";
import { formatStoreMoney, isProductOnSale, productDeliveryDescription } from "@/lib/storefront-cart";
import { categoryPath } from "@/lib/storefront-urls";
import type { TemplateProductProps } from "../types";
import { AtelierProductCard } from "./ProductCard";
import { AtelierPurchase } from "./Purchase";
import { ATELIER_CONTAINER, atelierEyebrow } from "./styles";

/**
 * Gallery-led product page: every photograph stacked (a swipeable row on
 * phones) beside a sticky purchase panel, with details in quiet
 * disclosures rather than a wall of text.
 */
export function AtelierProduct({ store, product, category, related }: TemplateProductProps) {
  const onSale = isProductOnSale(product);
  const images = product.images.length > 0 ? product.images : [{ url: product.imageUrl, alt: "" }];
  const stockNote =
    product.stock <= 0 ? "Sold out" : product.stock <= 3 ? `Only ${product.stock} available` : "Available";

  return (
    <main>
      <div className={`${ATELIER_CONTAINER} pt-6`}>
        <SfBreadcrumbs
          className="text-xs"
          items={[
            { label: "All pieces", href: "/shop" },
            ...(category ? [{ label: category.name, href: categoryPath(category) }] : []),
            { label: product.name },
          ]}
        />
      </div>

      <div className={`${ATELIER_CONTAINER} grid gap-10 pb-20 pt-6 lg:grid-cols-12 lg:gap-12`}>
        <section aria-label={`${product.name} photographs`} className="lg:col-span-7">
          <ul className="-mx-5 flex snap-x snap-mandatory gap-2 overflow-x-auto px-5 [scrollbar-width:none] sm:mx-0 sm:px-0 lg:flex-col lg:gap-3 lg:overflow-visible">
            {images.map((image, index) => (
              <li key={`${image.url}-${index}`} className="w-[86%] shrink-0 snap-start lg:w-full">
                <ProductImage
                  src={image.url}
                  alt={image.alt || `${product.name}${images.length > 1 ? `, photograph ${index + 1} of ${images.length}` : ""}`}
                  priority={index === 0}
                  className="aspect-[4/5] w-full bg-muted"
                />
              </li>
            ))}
          </ul>
        </section>

        <section aria-label="Purchase" className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            {category && <p className={atelierEyebrow}>{category.name}</p>}
            <h1 className="mt-4 font-heading text-4xl font-normal leading-tight lg:text-5xl">{product.name}</h1>
            <p className="mt-5 text-lg tabular-nums">
              {onSale && product.compareAtMinor && (
                <span className="me-3 text-muted-foreground line-through">
                  <span className="sr-only">Original price </span>
                  {formatStoreMoney(store, product.compareAtMinor)}
                </span>
              )}
              {onSale && <span className="sr-only">Sale price </span>}
              {formatStoreMoney(store, product.priceMinor)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {stockNote} · {productDeliveryDescription(product, store)}
            </p>

            {product.stock > 0 && (
              <div className="mt-8">
                <AtelierPurchase product={product} shownStoreId={store.id} />
                <p className="mt-3 text-xs text-muted-foreground">Pieces are not reserved while in your bag.</p>
              </div>
            )}

            <div className="mt-10 divide-y divide-border border-y border-border">
              {product.description && (
                <details open className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-xs uppercase tracking-[0.2em] rtl:tracking-normal [&::-webkit-details-marker]:hidden">
                    Description <span aria-hidden className="text-lg leading-none group-open:rotate-45 transition">+</span>
                  </summary>
                  <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{product.description}</p>
                </details>
              )}
              <details className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between text-xs uppercase tracking-[0.2em] rtl:tracking-normal [&::-webkit-details-marker]:hidden">
                  Delivery &amp; collection <span aria-hidden className="text-lg leading-none group-open:rotate-45 transition">+</span>
                </summary>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  {product.pickupOnly
                    ? `This piece is collected from ${store.name}; it cannot be delivered.`
                    : `${productDeliveryDescription(product, store)}. You can also choose collection from ${store.name} at checkout.`}
                </p>
              </details>
              <details className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between text-xs uppercase tracking-[0.2em] rtl:tracking-normal [&::-webkit-details-marker]:hidden">
                  Details <span aria-hidden className="text-lg leading-none group-open:rotate-45 transition">+</span>
                </summary>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <dt className="text-muted-foreground">Reference</dt>
                  <dd>{product.sku}</dd>
                  <dt className="text-muted-foreground">Availability</dt>
                  <dd>{product.stock > 0 ? `${product.stock} in stock` : "Sold out"}</dd>
                </dl>
              </details>
            </div>
          </div>
        </section>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="atelier-related" className="border-t border-border bg-surface py-20">
          <div className={ATELIER_CONTAINER}>
            <h2 id="atelier-related" className="font-heading text-3xl font-medium lg:text-4xl">You may also consider</h2>
            <ul className="-mx-5 mt-10 flex gap-5 overflow-x-auto px-5 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4 lg:gap-8">
              {related.map((item) => (
                <li key={item.id} className="w-[70%] shrink-0 sm:w-auto">
                  <AtelierProductCard product={item} store={store} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </main>
  );
}
