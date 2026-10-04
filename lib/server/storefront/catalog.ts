import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { Prisma } from "@/lib/generated/prisma/client";
import { PAYMENT_METHODS } from "@/lib/config";
import { storeFormatLocale } from "@/lib/standards";
import { normalizeRequestHostname } from "@/lib/store-domains";
import { isStoreIdCookieValue, STOREFRONT_STORE_COOKIE } from "@/lib/storefront-cookie";
import { isPlatformBusinessHost, isStorefrontPathPreviewHost, matchStoreHost, storeHostConfig } from "@/lib/store-host";
import { getTemplateDefinition, resolveTemplateKey } from "@/lib/templates/registry";
import { normalizeThemeConfig } from "@/lib/templates/theme";
import type {
  ListingQuery,
  ProductListing,
  StorefrontCategory,
  StorefrontContext,
  StorefrontProduct,
  StorefrontProductSummary,
  StorefrontStore,
} from "@/lib/storefront-types";
import { groupShelves, shelfCategories, type HomepageShelvesRequest, type StorefrontShelf } from "@/lib/storefront-shelves";
import { LISTING_PAGE_SIZE } from "@/lib/storefront-urls";
import type { PaymentMethodId } from "@/lib/types";
import type { Client } from "../admin/common";
import { getDb } from "../db";
import { pickTranslation } from "../store-scope";
import { bankTransferConfigurationIsValid, isOnlinePaymentMethodAvailable } from "../payments/methods";
import type { PaymentProviderAccountConfig } from "../payments/types";

// ---------------------------------------------------------------
// SHARED STOREFRONT CORE — PUBLIC READS (no sign-in)
//
// The only place storefront pages and templates get data from. Templates
// receive the typed results (lib/storefront-types.ts) and never query the
// database themselves.
//
// Only ACTIVE, non-archived stores and their ACTIVE products are ever
// returned: drafts, paused, suspended and archived stores — and draft or
// archived products — are simply not found. Every query is filtered by the
// storeId the server resolved from the request host, so a product id or
// slug from another store returns nothing. Results are plain serializable
// objects built field by field (money as minor-unit strings), so nothing
// else from the database row reaches the browser. Product lists are always
// bounded (one page, a featured row, the cart's own items): the full
// catalogue is never sent to the browser.
//
// Which store to show comes from the request's hostname
// (resolveStoreForHost, rules in lib/store-host.ts). The platform root,
// platform admin and store-admin hosts never select a store from a cookie.
// Only the explicit temporary path-preview host uses the preview cookie,
// and it never falls back to a default store.
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
 * archived): a public store host by slug, or the explicit temporary
 * path-preview cookie on its configured preview host. Platform roots,
 * admin hosts and unknown hosts never select a storefront from a cookie.
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
  if (!pathPreviewHost && (match.kind === "platform" || match.kind === "store-admin")) return null;
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

// ---------- Row -> DTO ----------

const MAX_PRODUCT_IMAGES = 12;
/** Upper bound for one cart lookup (the cart UI never holds more distinct products). */
export const MAX_CART_PRODUCTS = 100;
const SITEMAP_PRODUCT_LIMIT = 5000;
const PRODUCT_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function summaryInclude(storeId: string) {
  return {
    translations: true,
    variants: { where: { storeId, isDefault: true }, take: 1 },
    images: { orderBy: { position: "asc" }, take: 1 },
  } satisfies Prisma.ProductInclude;
}

type SummaryRow = Prisma.ProductGetPayload<{ include: ReturnType<typeof summaryInclude> }>;

function toSummary(row: SummaryRow, defaultLanguage: string): StorefrontProductSummary | null {
  const variant = row.variants[0];
  if (!variant) return null;
  const translation = pickTranslation(row.translations, defaultLanguage, defaultLanguage);
  return {
    id: row.id,
    storeId: row.storeId,
    slug: translation?.slug ?? "",
    name: translation?.name ?? "",
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

/** The public store's id and default language, or null. Every public read starts here. */
function publicStore(client: Client, storeId: string) {
  return client.store.findFirst({ where: { id: storeId, ...PUBLIC_STORE }, select: { id: true, defaultLanguage: true } });
}

// ---------- Store context ----------

/**
 * Branding, template selection, content and navigation of one public store,
 * or null. Small by design (no product list): it is shared by every page.
 */
export async function getStorefrontContext(client: Client, storeId: string): Promise<StorefrontContext | null> {
  const store = await client.store.findFirst({
    where: { id: storeId, ...PUBLIC_STORE },
    include: {
      currency: true,
      country: { select: { name: true } },
      language: { select: { direction: true } },
      paymentMethods: {
        where: { enabled: true },
        orderBy: { position: "asc" },
        include: { providerAccount: true },
      },
    },
  });
  if (!store) return null;

  const [content, categories] = await Promise.all([
    client.storeContentTranslation.findUnique({
      where: { storeId_locale: { storeId: store.id, locale: store.defaultLanguage } },
    }),
    client.category.findMany({
      where: { storeId: store.id },
      orderBy: { position: "asc" },
      include: {
        translations: true,
        _count: { select: { products: { where: { status: "ACTIVE" } } } },
      },
    }),
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

  // The template comes from THIS store's own row only; an unknown key or a
  // malformed theme falls back to safe defaults (lib/templates/*).
  const templateKey = resolveTemplateKey(store.templateKey);
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
    language: store.defaultLanguage,
    direction: store.language.direction === "RTL" ? "rtl" : "ltr",
    templateKey,
    theme: normalizeThemeConfig(getTemplateDefinition(templateKey), store.themeConfig),
    isDemo: store.isDemo,
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
    categories: categories.map((category): StorefrontCategory => {
      const translation = pickTranslation(category.translations, store.defaultLanguage, store.defaultLanguage);
      return {
        id: category.id,
        slug: translation?.slug ?? "",
        name: translation?.name ?? "",
        imageUrl: category.imageUrl ?? "",
        productCount: category._count.products,
      };
    }),
  };
}

// ---------- Product lists (always bounded) ----------

type ProductOrder = Prisma.ProductOrderByWithRelationInput[];

const FEATURED_ORDER: ProductOrder = [{ featured: "desc" }, { createdAt: "desc" }, { id: "asc" }];
const NEWEST_ORDER: ProductOrder = [{ createdAt: "desc" }, { id: "asc" }];

async function findSummaries(
  client: Client,
  storeId: string,
  defaultLanguage: string,
  where: Prisma.ProductWhereInput,
  orderBy: ProductOrder,
  skip: number,
  take: number,
): Promise<StorefrontProductSummary[]> {
  const rows = await client.product.findMany({
    where: { ...where, storeId, status: "ACTIVE" },
    orderBy,
    skip,
    take,
    include: summaryInclude(storeId),
  });
  return rows.map((row) => toSummary(row, defaultLanguage)).filter((p): p is StorefrontProductSummary => p !== null);
}

/** Same, ordered by the default variant's price (price lives on the variant). */
async function findSummariesByPrice(
  client: Client,
  storeId: string,
  defaultLanguage: string,
  where: Prisma.ProductWhereInput,
  direction: "asc" | "desc",
  skip: number,
  take: number,
): Promise<StorefrontProductSummary[]> {
  const ordered = await client.productVariant.findMany({
    where: { storeId, isDefault: true, product: { ...where, storeId, status: "ACTIVE" } },
    orderBy: [{ priceMinor: direction }, { productId: "asc" }],
    skip,
    take,
    select: { productId: true },
  });
  const ids = ordered.map((variant) => variant.productId);
  if (ids.length === 0) return [];
  const products = await findSummaries(client, storeId, defaultLanguage, { id: { in: ids } }, NEWEST_ORDER, 0, ids.length);
  const byId = new Map(products.map((product) => [product.id, product]));
  return ids.map((id) => byId.get(id)).filter((p): p is StorefrontProductSummary => p !== undefined);
}

/**
 * One page of a public store's ACTIVE products, optionally within one of
 * ITS categories and matching a search. `category` must come from this
 * store's own context (the caller looks it up by slug there).
 */
export async function getStorefrontProductListing(
  client: Client,
  storeId: string,
  category: StorefrontCategory | null,
  query: ListingQuery,
): Promise<ProductListing | null> {
  const store = await publicStore(client, storeId);
  if (!store) return null;
  const where: Prisma.ProductWhereInput = {
    storeId: store.id,
    status: "ACTIVE",
    ...(category && { categoryId: category.id }),
    ...(query.q && {
      translations: {
        some: {
          OR: [
            { name: { contains: query.q, mode: "insensitive" } },
            { description: { contains: query.q, mode: "insensitive" } },
          ],
        },
      },
    }),
  };
  const total = await client.product.count({ where });
  const skip = (query.page - 1) * LISTING_PAGE_SIZE;
  const products =
    total === 0 || skip >= total
      ? []
      : query.sort === "price-asc" || query.sort === "price-desc"
        ? await findSummariesByPrice(client, store.id, store.defaultLanguage, where, query.sort === "price-asc" ? "asc" : "desc", skip, LISTING_PAGE_SIZE)
        : await findSummaries(client, store.id, store.defaultLanguage, where, query.sort === "newest" ? NEWEST_ORDER : FEATURED_ORDER, skip, LISTING_PAGE_SIZE);
  return {
    products,
    category,
    query,
    total,
    pageSize: LISTING_PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / LISTING_PAGE_SIZE)),
  };
}

/** Featured products first, then the newest, up to `limit` (homepage). */
export async function getFeaturedProducts(client: Client, storeId: string, limit: number): Promise<StorefrontProductSummary[]> {
  const store = await publicStore(client, storeId);
  if (!store) return [];
  return findSummaries(client, store.id, store.defaultLanguage, {}, FEATURED_ORDER, 0, Math.min(Math.max(limit, 0), 48));
}

/**
 * Homepage category shelves (see lib/storefront-shelves.ts) for a template
 * that declares them. `categories` must be this store's own context
 * categories; `request` must already be normalized (normalizeShelvesRequest).
 *
 * Two bounded queries whatever the number of categories (no N+1):
 *   1. product ids only, ranked per category with a window function —
 *      featured first, then newest, matching FEATURED_ORDER — keeping at
 *      most `perCategory` per category; every row is filtered to THIS
 *      store's ACTIVE products in the requested categories.
 *   2. those ids' summaries through the same store-scoped reader every
 *      other list uses.
 * At most MAX_SHELF_CATEGORIES × MAX_SHELF_PRODUCTS (96) products.
 */
export async function getHomepageShelves(
  client: Client,
  storeId: string,
  categories: StorefrontCategory[],
  request: HomepageShelvesRequest,
): Promise<StorefrontShelf[]> {
  const wanted = shelfCategories(categories, request);
  if (wanted.length === 0) return [];
  const store = await publicStore(client, storeId);
  if (!store) return [];
  const limit = wanted.length * request.perCategory;
  const ranked = await client.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT "id" FROM (
      SELECT "id", ROW_NUMBER() OVER (
        PARTITION BY "categoryId" ORDER BY "featured" DESC, "createdAt" DESC, "id" ASC
      ) AS "rank"
      FROM "Product"
      WHERE "storeId" = ${store.id}
        AND "status" = 'ACTIVE'
        AND "categoryId" IN (${Prisma.join(wanted.map((category) => category.id))})
    ) AS "ranked"
    WHERE "rank" <= ${request.perCategory}
    LIMIT ${limit}
  `);
  const ids = ranked.map((row) => row.id);
  if (ids.length === 0) return [];
  const products = await findSummaries(client, store.id, store.defaultLanguage, { id: { in: ids } }, FEATURED_ORDER, 0, ids.length);
  return groupShelves(wanted, products, request.perCategory, store.id);
}

/** Other products of the same store and category (or the newest when uncategorised). */
export async function getRelatedProducts(
  client: Client,
  storeId: string,
  product: Pick<StorefrontProductSummary, "id" | "categoryId">,
  limit: number,
): Promise<StorefrontProductSummary[]> {
  const store = await publicStore(client, storeId);
  if (!store) return [];
  return findSummaries(
    client,
    store.id,
    store.defaultLanguage,
    { id: { not: product.id }, ...(product.categoryId && { categoryId: product.categoryId }) },
    FEATURED_ORDER,
    0,
    Math.min(Math.max(limit, 0), 12),
  );
}

/**
 * Fresh summaries of exactly the products in a shopper's cart, from THIS
 * store only. Ids of other stores, drafts or unknown products are simply
 * absent, so the cart treats them as unavailable.
 */
export async function getCartProducts(client: Client, storeId: string, ids: unknown[]): Promise<StorefrontProductSummary[]> {
  const wanted = [...new Set(ids.filter(isStoreIdCookieValue))].slice(0, MAX_CART_PRODUCTS);
  if (wanted.length === 0) return [];
  const store = await publicStore(client, storeId);
  if (!store) return [];
  return findSummaries(client, store.id, store.defaultLanguage, { id: { in: wanted } }, NEWEST_ORDER, 0, wanted.length);
}

/** Product ids and slugs for the store's sitemap (bounded). */
export async function getSitemapProducts(client: Client, storeId: string): Promise<Pick<StorefrontProductSummary, "id" | "slug">[]> {
  const store = await publicStore(client, storeId);
  if (!store) return [];
  const rows = await client.product.findMany({
    where: { storeId: store.id, status: "ACTIVE" },
    orderBy: NEWEST_ORDER,
    take: SITEMAP_PRODUCT_LIMIT,
    select: { id: true, translations: { select: { locale: true, slug: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    slug: pickTranslation(row.translations, store.defaultLanguage, store.defaultLanguage)?.slug ?? "",
  }));
}

// ---------- One product ----------

async function productDetail(client: Client, storeId: string, defaultLanguage: string, productId: string): Promise<StorefrontProduct | null> {
  const row = await client.product.findFirst({
    where: { id: productId, storeId, status: "ACTIVE" },
    include: {
      ...summaryInclude(storeId),
      images: { orderBy: { position: "asc" }, take: MAX_PRODUCT_IMAGES },
    },
  });
  if (!row) return null;
  const summary = toSummary(row, defaultLanguage);
  if (!summary) return null;
  const translation = pickTranslation(row.translations, defaultLanguage, defaultLanguage);
  return {
    ...summary,
    description: translation?.description ?? "",
    images: row.images.map((image) => ({ url: image.url, alt: image.altText ?? "" })),
  };
}

/** One ACTIVE product of a public store by id, or null (missing, draft, archived, or another store's). */
export async function getStorefrontProduct(
  client: Client,
  storeId: string,
  productId: string,
): Promise<StorefrontProduct | null> {
  if (!isStoreIdCookieValue(productId)) return null;
  const store = await publicStore(client, storeId);
  if (!store) return null;
  return productDetail(client, store.id, store.defaultLanguage, productId);
}

/**
 * One ACTIVE product of a public store by URL slug, or null. Slugs are
 * unique per store and language, and the lookup is filtered by this
 * store's id, so another store's slug can never resolve here. A slug in
 * the store's default language wins over the same slug in another language.
 */
export async function getStorefrontProductBySlug(
  client: Client,
  storeId: string,
  slug: unknown,
): Promise<StorefrontProduct | null> {
  if (typeof slug !== "string" || slug.length > 160 || !PRODUCT_SLUG.test(slug)) return null;
  const store = await publicStore(client, storeId);
  if (!store) return null;
  const matches = await client.productTranslation.findMany({
    where: { storeId: store.id, slug, product: { storeId: store.id, status: "ACTIVE" } },
    select: { productId: true, locale: true },
    take: 10,
  });
  const match = matches.find((m) => m.locale === store.defaultLanguage) ?? matches[0];
  return match ? productDetail(client, store.id, store.defaultLanguage, match.productId) : null;
}

// ---------- Per-request helpers for pages and layouts ----------

/** The public store this request's host serves (or the explicit preview host's cookie store), or null. */
export const getRequestStoreId = cache(async (): Promise<string | null> => {
  const [requestHeaders, jar] = await Promise.all([headers(), cookies()]);
  return resolveStoreForHost(getDb(), requestHeaders.get("host") ?? "", jar.get(STOREFRONT_STORE_COOKIE)?.value);
});

/** The store context for this request, resolved once and shared by the layout, pages and metadata. */
export const getRequestStorefront = cache(async (): Promise<StorefrontContext | null> => {
  const storeId = await getRequestStoreId();
  return storeId ? getStorefrontContext(getDb(), storeId) : null;
});

/** One product of this request's store by URL segment (shared by the product page and its metadata). */
export const getRequestStorefrontProductBySlug = cache(async (slug: string) => {
  const context = await getRequestStorefront();
  if (!context) return null;
  return getStorefrontProductBySlug(getDb(), context.store.id, slug);
});
