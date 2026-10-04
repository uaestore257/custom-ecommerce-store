import { SfBreadcrumbs } from "@/components/storefront/primitives";
import { formatStoreMoney, isProductOnSale, productDeliveryDescription } from "@/lib/storefront-cart";
import { categoryPath } from "@/lib/storefront-urls";
import type { TemplateProductProps } from "../types";
import { MaisonGallery } from "./Gallery";
import { MAISON_GRID, MaisonProductCard } from "./ProductCard";
import { MaisonPurchase } from "./Purchase";
import { MAISON_CONTAINER, maisonLabel } from "./styles";

const summary = `flex cursor-pointer list-none items-center justify-between py-5 ${maisonLabel} [&::-webkit-details-marker]:hidden`;
const marker = (
  <span aria-hidden className="text-base font-light leading-none transition-transform duration-500 group-open:rotate-45 motion-reduce:transition-none">+</span>
);

/**
 * Editorial product page: the gallery (swipe carousel on phones, a 2-up
 * grid of 2:3 photographs on large screens) beside a sticky, quiet
 * purchase column with details, delivery and reference in disclosures.
 */
export function MaisonProduct({ store, product, category, related }: TemplateProductProps) {
  const onSale = isProductOnSale(product);
  const images = product.images.length > 0 ? product.images : [{ url: product.imageUrl, alt: "" }];
  const stockNote = product.stock <= 0 ? "Sold out" : product.stock <= 3 ? `Only ${product.stock} available` : "Available";

  return (
    <main>
      <div className="grid lg:grid-cols-12">
        <section aria-label={`${product.name} photographs`} className="lg:col-span-7 xl:col-span-8">
          <MaisonGallery images={images} name={product.name} />
        </section>

        <section aria-label="Purchase" className="px-5 pb-20 pt-8 sm:px-8 lg:col-span-5 lg:px-12 lg:pt-10 xl:col-span-4">
          <div className="lg:sticky lg:top-28">
            <SfBreadcrumbs
              className="text-xs"
              items={[
                { label: "Collection", href: "/shop" },
                ...(category ? [{ label: category.name, href: categoryPath(category) }] : []),
                { label: product.name },
              ]}
            />
            <h1 className="mt-8 font-heading text-4xl leading-tight lg:text-5xl">{product.name}</h1>
            <p className="mt-5 text-base tabular-nums">
              {onSale && product.compareAtMinor && (
                <span className="me-3 text-muted-foreground line-through">
                  <span className="sr-only">Original price </span>
                  {formatStoreMoney(store, product.compareAtMinor)}
                </span>
              )}
              {onSale && <span className="sr-only">Sale price </span>}
              <span className={onSale ? "text-accent" : ""}>{formatStoreMoney(store, product.priceMinor)}</span>
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{stockNote}</p>

            {product.stock > 0 && (
              <div className="mt-10">
                <MaisonPurchase product={product} shownStoreId={store.id} />
                <p className="mt-3 text-xs text-muted-foreground">Pieces are not reserved while in your bag.</p>
              </div>
            )}

            <div className="mt-12 divide-y divide-border border-y border-border">
              {product.description && (
                <details open className="group">
                  <summary className={summary}>Description {marker}</summary>
                  <p className="pb-6 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{product.description}</p>
                </details>
              )}
              <details className="group">
                <summary className={summary}>Delivery &amp; collection {marker}</summary>
                <p className="pb-6 text-sm leading-relaxed text-muted-foreground">
                  {product.pickupOnly
                    ? `This piece is collected from ${store.name}; it cannot be delivered.`
                    : `${productDeliveryDescription(product, store)}. You can also choose collection from ${store.name} at checkout.`}
                </p>
              </details>
              <details className="group">
                <summary className={summary}>Details {marker}</summary>
                <dl className="grid grid-cols-2 gap-3 pb-6 text-sm">
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
        <section aria-labelledby="maison-related" className={`${MAISON_CONTAINER} border-t border-border py-20`}>
          <h2 id="maison-related" className={`${maisonLabel} text-center`}>You may also like</h2>
          <ul className={`mt-12 ${MAISON_GRID}`}>
            {related.map((item) => (
              <li key={item.id}>
                <MaisonProductCard product={item} store={store} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
