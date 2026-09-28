import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { DEFAULT_STOREFRONT_STORE_ID, PAYMENT_METHODS } from "@/lib/config";
import { storeFormatLocale } from "@/lib/standards";
import { isStoreIdCookieValue, STOREFRONT_STORE_COOKIE } from "@/lib/storefront-cookie";
import type {
  StorefrontCatalog,
  StorefrontProduct,
  StorefrontStore,
  StorefrontStoreOption,
} from "@/lib/storefront-types";
import type { PaymentMethodId } from "@/lib/types";
import type { Client } from "../admin/common";
import { getDb } from "../db";
import { storeScope } from "../store-scope";

// ---------------------------------------------------------------
// PUBLIC STOREFRONT READS (no sign-in)
//
// Only ACTIVE, non-archived stores and their ACTIVE products are ever
// returned: drafts, paused, suspended and archived stores — and draft or
// archived products — are simply not found. Everything goes through
// storeScope(), so a product id from another store returns nothing.
// Results are plain serializable objects built field by field (money as
// minor-unit strings), so nothing else from the database row reaches the
// browser.
//
// Which store to show is a TEMPORARY, demo-era choice (a browser cookie
// plus a configured default — see lib/storefront-cookie.ts). It is NOT
// domain-based tenant resolution; that replaces it in a later phase.
// ---------------------------------------------------------------

const PUBLIC_STORE = { status: "ACTIVE", archivedAt: null } as const;

/**
 * The store to show: the preferred (cookie) store if it is public, else
 * the configured default if that is public, else null. Deterministic and
 * never falls back to any other store.
 */
export async function resolveStorefrontStoreId(
  client: Client,
  preferredStoreId: unknown,
  defaultStoreId: string,
): Promise<string | null> {
  const candidates: string[] = [];
  if (isStoreIdCookieValue(preferredStoreId)) candidates.push(preferredStoreId);
  if (isStoreIdCookieValue(defaultStoreId) && !candidates.includes(defaultStoreId)) candidates.push(defaultStoreId);
  for (const id of candidates) {
    const store = await client.store.findFirst({ where: { id, ...PUBLIC_STORE }, select: { id: true } });
    if (store) return store.id;
  }
  return null;
}

/** Stores the public store switcher may offer: active and not archived. */
export async function listStorefrontStores(client: Client): Promise<StorefrontStoreOption[]> {
  const rows = await client.store.findMany({
    where: PUBLIC_STORE,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, name: true },
  });
  return rows.map((row) => ({ id: row.id, name: row.name }));
}

type ScopedProduct = NonNullable<Awaited<ReturnType<ReturnType<typeof storeScope>["getProduct"]>>>;

function toStorefrontProduct(row: ScopedProduct, storeId: string): StorefrontProduct | null {
  const variant = row.defaultVariant;
  if (!variant) return null;
  return {
    id: row.id,
    storeId,
    name: row.translation?.name ?? "",
    description: row.translation?.description ?? "",
    sku: variant.sku,
    categoryId: row.categoryId ?? "",
    priceMinor: variant.priceMinor.toString(),
    compareAtMinor: variant.compareAtMinor === null ? null : variant.compareAtMinor.toString(),
    imageUrl: row.images[0]?.url ?? "",
    stock: variant.stock,
    featured: row.featured,
  };
}

const KNOWN_PAYMENT_METHODS = new Set<string>(PAYMENT_METHODS.map((m) => m.id));

/** Branding, content, categories and active products of one public store, or null. */
export async function getStorefrontCatalog(client: Client, storeId: string): Promise<StorefrontCatalog | null> {
  const store = await client.store.findFirst({
    where: { id: storeId, ...PUBLIC_STORE },
    include: {
      currency: true,
      country: { select: { name: true } },
      paymentMethods: { where: { enabled: true }, orderBy: { position: "asc" } },
      shippingZones: {
        orderBy: { id: "asc" },
        take: 1,
        include: { rates: { where: { active: true }, orderBy: { id: "asc" }, take: 1 } },
      },
    },
  });
  if (!store) return null;

  const scope = storeScope(client, store.id);
  const [content, categories, products] = await Promise.all([
    client.storeContentTranslation.findUnique({
      where: { storeId_locale: { storeId: store.id, locale: store.defaultLanguage } },
    }),
    scope.listCategories(store.defaultLanguage),
    scope.listProducts({ locale: store.defaultLanguage, status: "ACTIVE" }),
  ]);

  const rate = store.shippingZones[0]?.rates[0];
  const address = (store.businessAddress ?? {}) as { line1?: unknown };

  const storefrontStore: StorefrontStore = {
    id: store.id,
    name: store.name,
    logoUrl: store.logoUrl ?? "",
    accentColor: store.accentColor ?? "#0f766e",
    countryCode: store.countryCode,
    countryName: store.country.name,
    currency: store.baseCurrency,
    minorUnits: store.currency.minorUnits,
    locale: storeFormatLocale(store),
    tagline: content?.tagline ?? "",
    heroTitle: content?.heroTitle ?? "",
    heroText: content?.heroText ?? "",
    aboutText: content?.aboutText ?? "",
    contactEmail: store.contactEmail ?? "",
    contactPhone: store.contactPhone ?? "",
    contactAddress: typeof address.line1 === "string" ? address.line1 : "",
    deliveryFeeMinor: rate ? rate.priceMinor.toString() : null,
    freeDeliveryOverMinor: rate?.freeOverMinor != null ? rate.freeOverMinor.toString() : null,
    paymentMethods: store.paymentMethods
      .map((m) => m.method)
      .filter((method): method is PaymentMethodId => KNOWN_PAYMENT_METHODS.has(method)),
  };

  return {
    store: storefrontStore,
    categories: categories.map((c) => ({ id: c.id, name: c.translation?.name ?? "", imageUrl: c.imageUrl ?? "" })),
    products: products
      .map((p) => toStorefrontProduct(p, store.id))
      .filter((p): p is StorefrontProduct => p !== null),
  };
}

/** One ACTIVE product of a public store, or null (missing, draft, archived, or another store's). */
export async function getStorefrontProduct(
  client: Client,
  storeId: string,
  productId: string,
): Promise<StorefrontProduct | null> {
  if (!isStoreIdCookieValue(productId)) return null;
  const store = await client.store.findFirst({
    where: { id: storeId, ...PUBLIC_STORE },
    select: { id: true, defaultLanguage: true },
  });
  if (!store) return null;
  const product = await storeScope(client, store.id).getProduct(productId, store.defaultLanguage);
  if (!product || product.status !== "ACTIVE") return null;
  return toStorefrontProduct(product, store.id);
}

// ---------- Per-request helpers for pages and layouts ----------

/** The store and catalog for this request, resolved once and shared by the layout and page. */
export const getRequestStorefront = cache(async () => {
  const db = getDb();
  const jar = await cookies();
  const storeId = await resolveStorefrontStoreId(
    db,
    jar.get(STOREFRONT_STORE_COOKIE)?.value,
    DEFAULT_STOREFRONT_STORE_ID,
  );
  const [catalog, stores] = await Promise.all([
    storeId ? getStorefrontCatalog(db, storeId) : Promise.resolve(null),
    listStorefrontStores(db),
  ]);
  return { catalog, stores };
});

/** A fresh read of one product of this request's store (for product pages and their metadata). */
export const getRequestStorefrontProduct = cache(async (productId: string) => {
  const { catalog } = await getRequestStorefront();
  if (!catalog) return null;
  return getStorefrontProduct(getDb(), catalog.store.id, productId);
});
