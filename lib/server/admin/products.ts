import "server-only";
import type { Prisma, PrismaClient } from "@/lib/generated/prisma/client";
import { formatMinorUnits, fromMinorUnits } from "@/lib/money";
import { storeFormatLocale } from "@/lib/standards";
import type { ActionResult, AdminProduct } from "@/lib/admin/types";
import { hasErrors, validateProduct, type CleanProduct } from "@/lib/admin/validation";
import { pickTranslation } from "../store-scope";
import { fail, INVALID, isRecordNotFound, NOT_FOUND, ok, toSlug, uniqueSlug, uniqueViolation, type Client } from "./common";

// ---------------------------------------------------------------
// PRODUCTS — always inside ONE store.
//
// Isolation rules every function follows:
//   * the storeId comes from the route (the caller), never from form data
//   * the store must exist and not be archived
//   * products are found with BOTH id and storeId; updates and deletes use
//     the compound key { id_storeId: { id, storeId } }, so a product of
//     another store is simply "not found" — its data is never returned
//   * the category must belong to the same store (also enforced by a
//     composite foreign key in the database)
// ---------------------------------------------------------------

/** The store context for product work, or null if missing/archived. */
export async function getProductStore(client: Client, storeId: string) {
  const store = await client.store.findFirst({
    where: { id: storeId, archivedAt: null },
    select: { id: true, baseCurrency: true, defaultLanguage: true, countryCode: true, formatLocale: true, currency: { select: { minorUnits: true } } },
  });
  if (!store) return null;
  return { ...store, minorUnits: store.currency.minorUnits, locale: storeFormatLocale(store) };
}

type ProductStore = NonNullable<Awaited<ReturnType<typeof getProductStore>>>;

const productInclude = {
  translations: true,
  variants: { where: { isDefault: true }, take: 1, include: { _count: { select: { orderItems: true } } } },
  images: { orderBy: { position: "asc" }, take: 1 },
  category: { include: { translations: true } },
} satisfies Prisma.ProductInclude;

type ProductRow = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

function toAdminProduct(row: ProductRow, store: ProductStore): AdminProduct {
  const variant = row.variants[0];
  const translation = pickTranslation(row.translations, store.defaultLanguage, store.defaultLanguage);
  const category = row.category
    ? pickTranslation(row.category.translations, store.defaultLanguage, store.defaultLanguage)
    : null;
  const money = (minor: bigint) => formatMinorUnits(minor, store.baseCurrency, store.minorUnits, store.locale);
  return {
    id: row.id,
    name: translation?.name ?? "",
    description: translation?.description ?? "",
    sku: variant?.sku ?? "",
    categoryId: row.categoryId ?? "",
    categoryName: category?.name ?? "Uncategorised",
    price: variant ? fromMinorUnits(variant.priceMinor, store.minorUnits) : "",
    compareAtPrice: variant?.compareAtMinor ? fromMinorUnits(variant.compareAtMinor, store.minorUnits) : "",
    priceDisplay: variant ? money(variant.priceMinor) : "",
    compareAtDisplay: variant?.compareAtMinor ? money(variant.compareAtMinor) : "",
    imageUrl: row.images[0]?.url ?? "",
    stock: variant?.stock ?? 0,
    status: row.status,
    featured: row.featured,
    hasOrders: (variant?._count.orderItems ?? 0) > 0,
  };
}

/** All products of the store, or null if the store does not exist. */
export async function listAdminProducts(client: Client, storeId: string): Promise<AdminProduct[] | null> {
  const store = await getProductStore(client, storeId);
  if (!store) return null;
  const rows = await client.product.findMany({
    where: { storeId: store.id },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: productInclude,
  });
  return rows.map((row) => toAdminProduct(row, store));
}

/** One product of THIS store, or null (also for another store's product). */
export async function getAdminProduct(client: Client, storeId: string, productId: string) {
  const store = await getProductStore(client, storeId);
  if (!store) return null;
  const row = await client.product.findFirst({ where: { id: productId, storeId: store.id }, include: productInclude });
  return row ? toAdminProduct(row, store) : null;
}

async function checkRelations(client: Client, storeId: string, values: CleanProduct, exceptVariantId?: string) {
  const errors: Record<string, string> = {};
  const category = await client.category.findFirst({ where: { id: values.categoryId, storeId }, select: { id: true } });
  if (!category) errors.categoryId = "Choose a category of this store.";
  const sku = await client.productVariant.findFirst({
    where: { storeId, sku: values.sku, ...(exceptVariantId && { id: { not: exceptVariantId } }) },
    select: { id: true },
  });
  if (sku) errors.sku = "Another product in this store uses this SKU.";
  return errors;
}

async function uniqueProductSlug(client: Client, store: ProductStore, name: string, exceptProductId?: string) {
  const base = toSlug(name, `product-${Date.now().toString(36)}`);
  const rows = await client.productTranslation.findMany({
    where: {
      storeId: store.id,
      locale: store.defaultLanguage,
      slug: { startsWith: base },
      ...(exceptProductId && { productId: { not: exceptProductId } }),
    },
    select: { slug: true },
  });
  return uniqueSlug(base, new Set(rows.map((r) => r.slug)));
}

function skuConflict(error: unknown) {
  return uniqueViolation(error)?.includes("sku") ? fail(INVALID, { sku: "Another product in this store uses this SKU." }) : null;
}

export async function createAdminProduct(
  client: PrismaClient,
  storeId: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const store = await getProductStore(client, storeId);
  if (!store) return fail(NOT_FOUND.store);
  const { values, errors } = validateProduct(input, store.minorUnits);
  if (hasErrors(errors)) return fail(INVALID, errors);
  const relationErrors = await checkRelations(client, store.id, values);
  if (hasErrors(relationErrors)) return fail(INVALID, relationErrors);

  try {
    const product = await client.product.create({
      data: {
        storeId: store.id, // from the route, never from the form
        categoryId: values.categoryId,
        status: values.status,
        featured: values.featured,
        // Nested records inherit storeId through the composite relations.
        translations: {
          create: [{
            locale: store.defaultLanguage,
            name: values.name,
            description: values.description,
            slug: await uniqueProductSlug(client, store, values.name),
          }],
        },
        variants: {
          create: [{
            sku: values.sku,
            isDefault: true,
            position: 0,
            currency: store.baseCurrency,
            priceMinor: values.priceMinor,
            compareAtMinor: values.compareAtMinor,
            stock: values.stock,
          }],
        },
        images: values.imageUrl ? { create: [{ url: values.imageUrl, position: 0 }] } : undefined,
      },
      select: { id: true },
    });
    return ok({ id: product.id }, "Product added.");
  } catch (error) {
    const conflict = skuConflict(error);
    if (conflict) return conflict;
    throw error;
  }
}

export async function updateAdminProduct(
  client: PrismaClient,
  storeId: string,
  productId: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const store = await getProductStore(client, storeId);
  if (!store) return fail(NOT_FOUND.store);
  // Scoped lookup: a product of another store is "not found".
  const existing = await client.product.findFirst({
    where: { id: productId, storeId: store.id },
    include: { variants: { where: { isDefault: true }, take: 1 }, translations: true },
  });
  if (!existing) return fail(NOT_FOUND.product);
  const variant = existing.variants[0];

  const { values, errors } = validateProduct(input, store.minorUnits);
  if (hasErrors(errors)) return fail(INVALID, errors);
  const relationErrors = await checkRelations(client, store.id, values, variant?.id);
  if (hasErrors(relationErrors)) return fail(INVALID, relationErrors);

  const current = existing.translations.find((t) => t.locale === store.defaultLanguage);
  const slug = current && current.name === values.name
    ? current.slug
    : await uniqueProductSlug(client, store, values.name, productId);

  try {
    await client.$transaction(async (tx) => {
      const key = { id_storeId: { id: productId, storeId: store.id } };
      await tx.product.update({
        where: key,
        data: { categoryId: values.categoryId, status: values.status, featured: values.featured },
      });
      await tx.productTranslation.upsert({
        where: { productId_locale: { productId, locale: store.defaultLanguage } },
        create: { productId, storeId: store.id, locale: store.defaultLanguage, name: values.name, description: values.description, slug },
        update: { name: values.name, description: values.description, slug },
      });
      await tx.productVariant.update({
        where: { id_storeId: { id: variant.id, storeId: store.id } },
        data: { sku: values.sku, priceMinor: values.priceMinor, compareAtMinor: values.compareAtMinor, stock: values.stock },
      });
      await tx.productImage.deleteMany({ where: { productId, storeId: store.id } });
      if (values.imageUrl) {
        await tx.productImage.create({ data: { productId, storeId: store.id, url: values.imageUrl, position: 0 } });
      }
    });
  } catch (error) {
    const conflict = skuConflict(error);
    if (conflict) return conflict;
    if (isRecordNotFound(error)) return fail(NOT_FOUND.product);
    throw error;
  }
  return ok({ id: productId }, "Product saved.");
}

/**
 * Deletes a product of THIS store. Products with past orders are archived
 * instead, because order items keep a reference to their variant.
 */
export async function deleteAdminProduct(
  client: Client,
  storeId: string,
  productId: string,
): Promise<ActionResult<{ id: string; archived: boolean }>> {
  const store = await getProductStore(client, storeId);
  if (!store) return fail(NOT_FOUND.store);
  const key = { id_storeId: { id: productId, storeId: store.id } };
  const orderItems = await client.orderItem.count({ where: { storeId: store.id, variant: { productId } } });
  try {
    if (orderItems > 0) {
      await client.product.update({ where: key, data: { status: "ARCHIVED" } });
      return ok({ id: productId, archived: true }, "This product has past orders, so it was archived instead of deleted.");
    }
    await client.product.delete({ where: key });
    return ok({ id: productId, archived: false }, "Product deleted.");
  } catch (error) {
    if (isRecordNotFound(error)) return fail(NOT_FOUND.product);
    throw error;
  }
}

/** Number of ACTIVE products in the store (for the overview). */
export function countActiveProducts(client: Client, storeId: string) {
  return client.product.count({ where: { storeId, status: "ACTIVE" } });
}
