import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { DEFAULT_STOREFRONT_STORE_ID, PAYMENT_METHODS } from "@/lib/config";
import { storeFormatLocale } from "@/lib/standards";
import { normalizeRequestHostname } from "@/lib/store-domains";
import { isStoreIdCookieValue, STOREFRONT_STORE_COOKIE } from "@/lib/storefront-cookie";
import { isPlatformBusinessHost, isStorefrontPathPreviewHost, matchStoreHost, storeHostConfig } from "@/lib/store-host";
import type { StorefrontCatalog, StorefrontProduct, StorefrontStore } from "@/lib/storefront-types";
import type { PaymentMethodId } from "@/lib/types";
import type { Client } from "../admin/common";
import { getDb } from "../db";
import { storeScope } from "../store-scope";
import { bankTransferConfigurationIsValid, isOnlinePaymentMethodAvailable } from "../payments/methods";
import type { PaymentProviderAccountConfig } from "../payments/types";

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
// Which store to show comes from the request's hostname
// (resolveStoreForHost, rules in lib/store-host.ts). The bare development
// root is the business website, not a storefront. ADMIN_HOST may use the
// platform preview cookie plus configured default; temporary path mode is
// cookie-only on its configured root host.
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

/**
 * The store a request's Host serves, if it is public (ACTIVE, not
 * archived): a store's own host by slug; on the platform host, the
 * preview cookie's store or the default (resolveStorefrontStoreId); an
 * unknown host serves no store. Never another store than the host names.
 */
export async function resolveStoreForHost(
  client: Client,
  host: string,
  previewCookie: unknown,
  env: NodeJS.ProcessEnv = process.env,
): Promise<string | null> {
  const pathPreviewHost = isStorefrontPathPreviewHost(host, env);
  if (isPlatformBusinessHost(host, env) && !pathPreviewHost) return null;
  const config = storeHostConfig(env);
  const match = matchStoreHost(host, config);
  if (!pathPreviewHost && match.kind === "platform") {
    return resolveStorefrontStoreId(client, previewCookie, DEFAULT_STOREFRONT_STORE_ID);
  }
  const hostname = normalizeRequestHostname(host);
  if (hostname) {
    // Database ownership overrides an operator alias, including PENDING or
    // DISABLED rows, so a reused hostname can never fall back to another store.
    const customDomain = await client.storeDomain.findUnique({
      where: { hostname },
      select: { storeId: true, status: true },
    });
    if (customDomain) {
      if (customDomain.status !== "VERIFIED") return null;
      const store = await client.store.findFirst({
        where: { id: customDomain.storeId, ...PUBLIC_STORE },
        select: { id: true },
      });
      return store?.id ?? null;
    }
  }
  if (pathPreviewHost) return resolveStorefrontStoreId(client, previewCookie, "");
  if (match.kind !== "store") return null;
  const store = await client.store.findFirst({ where: { slug: match.slug, ...PUBLIC_STORE }, select: { id: true } });
  return store?.id ?? null;
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
    deliveryFeeMinor: row.deliveryFeeMinor.toString(),
    freeDelivery: row.freeDelivery,
    pickupOnly: row.pickupOnly,
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
      paymentMethods: {
        where: { enabled: true },
        orderBy: { position: "asc" },
        include: { providerAccount: true },
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

  const address = (store.businessAddress ?? {}) as { line1?: unknown };

  const paymentMethods: PaymentMethodId[] = [];
  for (const method of store.paymentMethods) {
    if (!KNOWN_PAYMENT_METHODS.has(method.method)) continue;
    if (method.method === "bank_transfer") {
      if (bankTransferConfigurationIsValid(method.providerAccount?.publicConfig)) paymentMethods.push("bank_transfer");
      continue;
    }
    const providerMethod = method.method as PaymentMethodId;
    if (
      ["stripe_checkout", "jazzcash", "easypaisa"].includes(method.method) &&
      !(await isOnlinePaymentMethodAvailable(
        providerMethod,
        method.providerAccount as PaymentProviderAccountConfig | null,
        { id: store.id, countryCode: store.countryCode, currency: store.baseCurrency },
      ))
    ) {
      continue;
    }
    paymentMethods.push(providerMethod);
  }

  const storefrontStore: StorefrontStore = {
    id: store.id,
    slug: store.slug,
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
    paymentMethods,
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
  const [requestHeaders, jar] = await Promise.all([headers(), cookies()]);
  const storeId = await resolveStoreForHost(db, requestHeaders.get("host") ?? "", jar.get(STOREFRONT_STORE_COOKIE)?.value);
  const catalog = storeId ? await getStorefrontCatalog(db, storeId) : null;
  return { catalog };
});

/** A fresh read of one product of this request's store (for product pages and their metadata). */
export const getRequestStorefrontProduct = cache(async (productId: string) => {
  const { catalog } = await getRequestStorefront();
  if (!catalog) return null;
  return getStorefrontProduct(getDb(), catalog.store.id, productId);
});
