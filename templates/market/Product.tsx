import { SfBreadcrumbs } from "@/components/storefront/primitives";
import { formatStoreMoney, isProductOnSale, productDeliveryDescription } from "@/lib/storefront-cart";
import { categoryPath } from "@/lib/storefront-urls";
import type { TemplateProductProps } from "../types";
import { MarketGallery } from "./Gallery";
import { MarketProductCard } from "./ProductCard";
import { MarketPurchase } from "./Purchase";
import { MARKET_CONTAINER, marketSectionTitle } from "./styles";

/**
 * A compact product page: image and purchase above the fold on phones,
 * price first, the facts a repeat shopper needs (delivery, stock), the
 * shared quantity + add control, and related products as a shelf.
 */
export function MarketProduct({ store, product, category, related }: TemplateProductProps) {
  const onSale = isProductOnSale(product);
  const images = product.images.length > 0 ? product.images : [{ url: product.imageUrl, alt: "" }];
  const inStock = product.stock > 0;

  return (
    <main className={`${MARKET_CONTAINER} py-4 sm:py-6`}>
      <SfBreadcrumbs
        items={[
          { label: "Shop", href: "/shop" },
          ...(category ? [{ label: category.name, href: categoryPath(category) }] : []),
          { label: product.name },
        ]}
      />
      <div className="mt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-10">
        <section aria-label={`${product.name} images`}>
          <MarketGallery images={images} name={product.name} />
        </section>
        <section aria-label="Purchase" className="min-w-0">
          <h1 className="font-heading text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">{product.name}</h1>
          <p className="mt-2 flex flex-wrap items-baseline gap-x-2 tabular-nums">
            <span className={`text-3xl font-extrabold ${onSale ? "text-destructive" : ""}`}>
              {onSale && <span className="sr-only">Sale price </span>}
              {formatStoreMoney(store, product.priceMinor)}
            </span>
            {onSale && product.compareAtMinor && (
              <span className="text-base text-muted-foreground line-through">
                <span className="sr-only">Original price </span>
                {formatStoreMoney(store, product.compareAtMinor)}
              </span>
            )}
          </p>
          <ul className="mt-3 flex flex-wrap gap-2 text-xs font-semibold" aria-label="Product facts">
            <li className="rounded-full bg-muted px-3 py-1">{productDeliveryDescription(product, store)}</li>
            <li className={`rounded-full px-3 py-1 ${!inStock ? "bg-destructive/10 text-destructive" : product.stock <= 5 ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
              {!inStock ? "Out of stock" : product.stock <= 5 ? `Only ${product.stock} left` : "In stock"}
            </li>
            <li className="rounded-full bg-muted px-3 py-1">SKU {product.sku}</li>
          </ul>
          {inStock && (
            <div className="mt-5 max-w-md">
              <MarketPurchase product={product} shownStoreId={store.id} />
            </div>
          )}
          {product.description && (
            <div className="mt-6 border-t border-border pt-4">
              <h2 className="text-sm font-bold">About this product</h2>
              <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{product.description}</p>
            </div>
          )}
        </section>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="market-related" className="pt-8">
          <h2 id="market-related" className={marketSectionTitle}>More from {category?.name ?? store.name}</h2>
          <ul className="relative -mx-3 mt-3 flex snap-x scroll-px-3 gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:mx-0 sm:scroll-px-0 sm:px-0">
            {related.map((item) => (
              <li key={item.id} className="w-[44%] shrink-0 snap-start sm:w-48">
                <MarketProductCard product={item} store={store} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
