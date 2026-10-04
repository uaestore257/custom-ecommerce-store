import { SfBreadcrumbs } from "@/components/storefront/primitives";
import { messagesFor, storefrontUiLocale } from "@/lib/storefront-i18n";
import { formatStoreMoney, isProductOnSale } from "@/lib/storefront-cart";
import { categoryPath } from "@/lib/storefront-urls";
import type { TemplateProductProps } from "../types";
import { NoorGallery } from "./Gallery";
import { noorMessages } from "./messages";
import { NoorOrnament } from "./Ornament";
import { NOOR_GRID, NoorProductCard } from "./ProductCard";
import { NoorPurchase } from "./Purchase";
import { NOOR_CONTAINER, noorEyebrow, noorTitle } from "./styles";

/**
 * The product page: the arched gallery beside a centred-on-phone purchase
 * column — name, price (with the original price when reduced), stock,
 * delivery or pickup from the product's own data, the shared purchase
 * control — and description and reference beneath. Only real product
 * fields are shown; nothing is inferred.
 */
export function NoorProduct({ store, product, category, related }: TemplateProductProps) {
  const locale = storefrontUiLocale(store);
  const t = noorMessages(locale);
  const shared = messagesFor(locale);
  const onSale = isProductOnSale(product);
  const inStock = product.stock > 0;
  const images = product.images.length > 0 ? product.images : [{ url: product.imageUrl, alt: "" }];
  const delivery = product.pickupOnly
    ? t.pickupOnly
    : product.freeDelivery
      ? t.freeDelivery
      : t.deliveryFee(formatStoreMoney(store, product.deliveryFeeMinor));
  const stock = !inStock ? t.soldOut : product.stock <= 3 ? t.onlyLeft(product.stock) : t.inStock;

  return (
    <main className={`${NOOR_CONTAINER} py-8 lg:py-12`}>
      <SfBreadcrumbs
        label={shared.breadcrumb}
        className="text-xs"
        items={[
          { label: t.shop, href: "/shop" },
          ...(category ? [{ label: category.name, href: categoryPath(category) }] : []),
          { label: product.name },
        ]}
      />

      <div className="mt-8 grid gap-12 lg:grid-cols-2 lg:gap-16">
        <section aria-label={t.images(product.name)}>
          <NoorGallery images={images} name={product.name} />
        </section>

        <section aria-label={t.purchase} className="text-center lg:pt-10 lg:text-start">
          {category && <p className={noorEyebrow}>{category.name}</p>}
          <h1 className="mt-3 font-heading text-4xl leading-tight sm:text-5xl">{product.name}</h1>
          <p className="mt-5 flex flex-wrap items-baseline justify-center gap-x-3 text-xl tabular-nums lg:justify-start">
            {onSale && product.compareAtMinor && (
              <span className="text-base text-muted-foreground line-through">
                <span className="sr-only">{t.originalPrice} </span>
                {formatStoreMoney(store, product.compareAtMinor)}
              </span>
            )}
            <span className={onSale ? "text-accent" : ""}>
              {onSale && <span className="sr-only">{t.salePrice} </span>}
              {formatStoreMoney(store, product.priceMinor)}
            </span>
          </p>
          <ul className="mt-4 flex flex-wrap justify-center gap-2 text-xs lg:justify-start">
            <li className={`rounded-full border px-3 py-1 ${inStock ? "border-border" : "border-destructive/40 text-destructive"}`}>{stock}</li>
            <li className="rounded-full border border-border px-3 py-1">{delivery}</li>
          </ul>

          {inStock && (
            <div className="mx-auto mt-8 max-w-md lg:mx-0">
              <NoorPurchase product={product} shownStoreId={store.id} />
              <p className="mt-3 text-xs text-muted-foreground">{shared.notReserved}</p>
            </div>
          )}

          <div className="mx-auto mt-10 max-w-md divide-y divide-border border-y border-border text-start lg:mx-0">
            {product.description && (
              <div className="py-5">
                <h2 className="font-heading text-lg">{t.description}</h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{product.description}</p>
              </div>
            )}
            <div className="py-5">
              <h2 className="font-heading text-lg">{t.deliveryAndPickup}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{product.pickupOnly ? t.pickupOnlyNote(store.name) : `${delivery}. ${t.pickupAlso(store.name)}`}</p>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 py-5 text-sm">
              <dt className="text-muted-foreground">{t.reference}</dt>
              <dd>{product.sku}</dd>
            </dl>
          </div>
        </section>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="noor-related" className="mt-20 border-t border-border pt-16">
          <div className="text-center">
            <h2 id="noor-related" className={noorTitle}>{t.related}</h2>
            <NoorOrnament className="mt-5" />
          </div>
          <ul className={`mt-12 ${NOOR_GRID}`}>
            {related.map((item) => (
              <li key={item.id} className="min-w-0">
                <NoorProductCard product={item} store={store} t={t} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
