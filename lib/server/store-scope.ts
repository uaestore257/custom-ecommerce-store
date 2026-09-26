import "server-only";
import type { Prisma, PrismaClient } from "@/lib/generated/prisma/client";
import { toMinorUnits } from "@/lib/money";

// ---------------------------------------------------------------
// STORE-SCOPED DATA ACCESS (server only)
//
// All reads and writes of store-owned data go through storeScope().
// Every query it builds includes `storeId`, so a caller can only ever
// see or change records of the store it was created for — asking for
// another store's product simply returns null.
//
// Layers of protection:
//   1. Here: storeId is added to every query (never taken from the
//      request body).
//   2. Phase 2: requireStoreAccess(user, storeId, role) runs BEFORE
//      storeScope() is created, using StoreMembership.
//   3. The database: composite foreign keys, CHECK constraints and
//      triggers reject cross-store links even if the code has a bug.
// ---------------------------------------------------------------

type Client = PrismaClient | Prisma.TransactionClient;

export class StoreNotFoundError extends Error {}

type TranslationLike = { locale: string };

/** Requested locale → store default language → any available translation. */
export function pickTranslation<T extends TranslationLike>(
  translations: T[],
  locale: string,
  defaultLanguage: string,
): T | null {
  return (
    translations.find((t) => t.locale === locale) ??
    translations.find((t) => t.locale === defaultLanguage) ??
    translations[0] ??
    null
  );
}

export interface NewProductInput {
  categoryId?: string | null;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  featured?: boolean;
  /** At least one translation. Locales must be enabled for the store. */
  translations: { locale: string; name: string; description?: string; slug: string }[];
  /** The default variant. Price as a decimal string, e.g. "12.500". */
  defaultVariant: { sku: string; price: string; compareAtPrice?: string | null; stock: number };
}

export function storeScope(client: Client, storeId: string) {
  /** The (non-archived) store with its currency, or throws. */
  async function requireStore() {
    const store = await client.store.findFirst({
      where: { id: storeId, archivedAt: null },
      include: { currency: true },
    });
    if (!store) throw new StoreNotFoundError(`Store ${storeId} not found`);
    return store;
  }

  return {
    storeId,

    getStore() {
      return client.store.findFirst({
        where: { id: storeId, archivedAt: null },
        include: { currency: true, languages: { where: { enabled: true } } },
      });
    },

    async listCategories(locale: string) {
      const store = await requireStore();
      const categories = await client.category.findMany({
        where: { storeId },
        orderBy: { position: "asc" },
        include: { translations: true },
      });
      return categories.map((c) => ({
        ...c,
        translation: pickTranslation(c.translations, locale, store.defaultLanguage),
      }));
    },

    async listProducts(options: { locale: string; status?: "DRAFT" | "ACTIVE" | "ARCHIVED" }) {
      const store = await requireStore();
      const products = await client.product.findMany({
        where: { storeId, ...(options.status && { status: options.status }) },
        orderBy: { createdAt: "asc" },
        include: {
          translations: true,
          variants: { where: { storeId }, orderBy: { position: "asc" } },
          images: { orderBy: { position: "asc" } },
        },
      });
      return products.map((p) => ({
        ...p,
        translation: pickTranslation(p.translations, options.locale, store.defaultLanguage),
        defaultVariant: p.variants.find((v) => v.isDefault) ?? null,
      }));
    },

    /** Returns null for products of any other store. */
    async getProduct(productId: string, locale: string) {
      const store = await requireStore();
      const product = await client.product.findFirst({
        where: { id: productId, storeId },
        include: {
          translations: true,
          variants: { where: { storeId }, orderBy: { position: "asc" } },
          images: { orderBy: { position: "asc" } },
        },
      });
      if (!product) return null;
      return {
        ...product,
        translation: pickTranslation(product.translations, locale, store.defaultLanguage),
        defaultVariant: product.variants.find((v) => v.isDefault) ?? null,
      };
    },

    /**
     * Creates a product together with its default variant and
     * translations in one transaction. Price and currency always come
     * from the store (its base currency and ISO 4217 minor units).
     */
    async createProduct(input: NewProductInput) {
      const store = await requireStore();
      if (input.translations.length === 0) {
        throw new Error("A product needs at least one translation.");
      }
      const minorUnits = store.currency.minorUnits;
      const data = {
        storeId,
        categoryId: input.categoryId ?? null,
        status: input.status ?? "DRAFT",
        featured: input.featured ?? false,
        translations: {
          // storeId comes from the parent product (composite relation).
          create: input.translations.map((t) => ({
            locale: t.locale,
            name: t.name,
            description: t.description ?? "",
            slug: t.slug,
          })),
        },
        variants: {
          create: [
            {
              sku: input.defaultVariant.sku,
              isDefault: true,
              position: 0,
              currency: store.baseCurrency,
              priceMinor: toMinorUnits(input.defaultVariant.price, minorUnits),
              compareAtMinor: input.defaultVariant.compareAtPrice
                ? toMinorUnits(input.defaultVariant.compareAtPrice, minorUnits)
                : null,
              stock: input.defaultVariant.stock,
            },
          ],
        },
      } satisfies Prisma.ProductUncheckedCreateInput;
      return client.product.create({ data, include: { variants: true, translations: true } });
    },

    /**
     * Reserves the next order number for this store. The UPDATE locks the
     * store row, so concurrent checkouts always get different numbers.
     * Call inside the same transaction that creates the order.
     */
    async allocateOrderNumber(tx: Prisma.TransactionClient) {
      const updated = await tx.store.update({
        where: { id: storeId },
        data: { nextOrderNumber: { increment: 1 } },
        select: { nextOrderNumber: true, orderNumberPrefix: true },
      });
      const number = updated.nextOrderNumber - 1;
      return {
        number,
        display: updated.orderNumberPrefix ? `${updated.orderNumberPrefix}-${number}` : String(number),
      };
    },
  };
}

// ---------------------------------------------------------------
// Platform-level store management (platform owner only, from Phase 2)
// ---------------------------------------------------------------

export function listStores(client: Client, options: { includeArchived?: boolean } = {}) {
  return client.store.findMany({
    where: options.includeArchived ? {} : { archivedAt: null },
    orderBy: { createdAt: "asc" },
  });
}

/** Soft delete: hides the store but keeps all its data. */
export function archiveStore(client: Client, storeId: string) {
  return client.store.update({ where: { id: storeId }, data: { archivedAt: new Date() } });
}

export function restoreStore(client: Client, storeId: string) {
  return client.store.update({ where: { id: storeId }, data: { archivedAt: null } });
}
