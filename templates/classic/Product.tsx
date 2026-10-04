import { ProductImage } from "@/components/ProductImage";
import { ProductPurchase } from "@/components/storefront/CartControls";
import { SfBreadcrumbs } from "@/components/storefront/primitives";
import { formatStoreMoney, isProductOnSale, productDeliveryDescription } from "@/lib/storefront-cart";
import { categoryPath } from "@/lib/storefront-urls";
import type { TemplateProductProps } from "../types";
import { PRODUCT_GRID, ProductCard } from "./ProductCard";

export function ClassicProduct({ store, product, category, related }: TemplateProductProps) {
  const onSale = isProductOnSale(product);
  const categoryName = category?.name ?? "";

  return (
    <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-10 md:py-14">
      <SfBreadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          ...(category ? [{ label: category.name, href: categoryPath(category) }] : []),
          { label: product.name },
        ]}
      />

      <div className="mt-4 grid grid-cols-1 gap-6 sm:mt-6 md:grid-cols-2 md:gap-10">
        <div className="relative">
          <ProductImage src={product.imageUrl} alt={product.name} priority className="aspect-square w-full rounded-card border border-border" />
          {onSale && (
            <span className="absolute start-3 top-3 rounded bg-foreground px-2 py-1 text-xs font-bold uppercase tracking-wider text-background">Sale</span>
          )}
        </div>

        <div className="min-w-0">
          {categoryName && (
            <span className="inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">{categoryName}</span>
          )}
          <h1 className="mt-3 font-heading text-2xl font-bold tracking-tight sm:mt-4 sm:text-4xl">{product.name}</h1>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 sm:mt-3">
            <p className="text-2xl font-semibold text-accent">
              {onSale && <span className="sr-only">Sale price </span>}
              {formatStoreMoney(store, product.priceMinor)}
            </p>
            {onSale && product.compareAtMinor && (
              <>
                <p className="text-base text-muted-foreground line-through">
                  <span className="sr-only">Original price </span>
                  {formatStoreMoney(store, product.compareAtMinor)}
                </p>
                <p className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                  Save {formatStoreMoney(store, BigInt(product.compareAtMinor) - BigInt(product.priceMinor))}
                </p>
              </>
            )}
          </div>
          <p className="mt-2 text-sm font-medium text-foreground/80">{productDeliveryDescription(product, store)}</p>
          {product.description && (
            <p className="mt-4 whitespace-pre-line leading-relaxed text-muted-foreground sm:mt-6">{product.description}</p>
          )}

          <dl className="mt-5 grid grid-cols-2 gap-4 border-y border-border py-4 text-sm sm:mt-6">
            <div>
              <dt className="text-muted-foreground">SKU</dt>
              <dd className="font-medium">{product.sku}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Availability</dt>
              <dd className={`font-medium ${product.stock > 0 ? "text-success" : "text-destructive"}`}>
                {product.stock > 0 ? `In stock (${product.stock})` : "Out of stock"}
              </dd>
            </div>
          </dl>
          {product.stock > 0 && <p className="mt-2 text-xs text-muted-foreground">Stock is not reserved while items are in your cart.</p>}

          {product.stock > 0 && <ProductPurchase product={product} shownStoreId={store.id} className="mt-5 sm:mt-6 sm:max-w-md" />}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-10 sm:mt-16">
          <h2 className="font-heading text-xl font-bold tracking-tight sm:text-2xl">{categoryName ? `More in ${categoryName}` : "You may also like"}</h2>
          <div className={`mt-4 sm:mt-6 ${PRODUCT_GRID}`}>
            {related.map((item) => (
              <ProductCard key={item.id} product={item} store={store} categoryName={categoryName} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
