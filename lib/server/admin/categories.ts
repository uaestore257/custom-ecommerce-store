import "server-only";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import type { ActionResult, AdminCategory } from "@/lib/admin/types";
import { hasErrors, validateCategory } from "@/lib/admin/validation";
import { pickTranslation } from "../store-scope";
import { fail, INVALID, isRecordNotFound, NOT_FOUND, ok, toSlug, uniqueSlug, type Client } from "./common";
import { getProductStore } from "./products";

// ---------------------------------------------------------------
// CATEGORIES — always inside ONE store (same rules as products).
// Names are stored as translations in the store's default language.
// ---------------------------------------------------------------

export async function listAdminCategories(client: Client, storeId: string): Promise<AdminCategory[] | null> {
  const store = await getProductStore(client, storeId);
  if (!store) return null;
  const rows = await client.category.findMany({
    where: { storeId: store.id },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    include: { translations: true, _count: { select: { products: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    name: pickTranslation(row.translations, store.defaultLanguage, store.defaultLanguage)?.name ?? "Untitled",
    imageUrl: row.imageUrl ?? "",
    position: row.position,
    productCount: row._count.products,
  }));
}

async function nameTaken(client: Client, storeId: string, locale: string, name: string, exceptId?: string) {
  const rows = await client.categoryTranslation.findMany({
    where: { storeId, locale, name: { equals: name, mode: "insensitive" }, ...(exceptId && { categoryId: { not: exceptId } }) },
    select: { categoryId: true },
  });
  return rows.length > 0;
}

async function categorySlug(client: Client, storeId: string, locale: string, name: string, exceptId?: string) {
  const base = toSlug(name, `category-${Date.now().toString(36)}`);
  const rows = await client.categoryTranslation.findMany({
    where: { storeId, locale, slug: { startsWith: base }, ...(exceptId && { categoryId: { not: exceptId } }) },
    select: { slug: true },
  });
  return uniqueSlug(base, new Set(rows.map((r) => r.slug)));
}

const duplicateName = () => fail(INVALID, { name: "This store already has a category with this name." });

export async function createAdminCategory(client: Client, storeId: string, input: unknown): Promise<ActionResult<{ id: string }>> {
  const store = await getProductStore(client, storeId);
  if (!store) return fail(NOT_FOUND.store);
  const { values, errors } = validateCategory(input);
  if (hasErrors(errors)) return fail(INVALID, errors);
  if (await nameTaken(client, store.id, store.defaultLanguage, values.name)) return duplicateName();

  const last = await client.category.findFirst({ where: { storeId: store.id }, orderBy: { position: "desc" }, select: { position: true } });
  const category = await client.category.create({
    data: {
      storeId: store.id,
      position: (last?.position ?? -1) + 1,
      imageUrl: values.imageUrl,
      translations: {
        create: [{
          locale: store.defaultLanguage,
          name: values.name,
          slug: await categorySlug(client, store.id, store.defaultLanguage, values.name),
        }],
      },
    },
    select: { id: true },
  });
  return ok({ id: category.id }, `"${values.name}" added.`);
}

export async function updateAdminCategory(
  client: PrismaClient,
  storeId: string,
  categoryId: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const store = await getProductStore(client, storeId);
  if (!store) return fail(NOT_FOUND.store);
  const existing = await client.category.findFirst({ where: { id: categoryId, storeId: store.id }, select: { id: true } });
  if (!existing) return fail(NOT_FOUND.category);
  const { values, errors } = validateCategory(input);
  if (hasErrors(errors)) return fail(INVALID, errors);
  if (await nameTaken(client, store.id, store.defaultLanguage, values.name, categoryId)) return duplicateName();

  const slug = await categorySlug(client, store.id, store.defaultLanguage, values.name, categoryId);
  await client.$transaction([
    client.category.update({ where: { id_storeId: { id: categoryId, storeId: store.id } }, data: { imageUrl: values.imageUrl } }),
    client.categoryTranslation.upsert({
      where: { categoryId_locale: { categoryId, locale: store.defaultLanguage } },
      create: { categoryId, storeId: store.id, locale: store.defaultLanguage, name: values.name, slug },
      update: { name: values.name, slug },
    }),
  ]);
  return ok({ id: categoryId }, "Category saved.");
}

/** Moves a category one place up (-1) or down (+1) in the store's order. */
export async function moveAdminCategory(client: PrismaClient, storeId: string, categoryId: string, direction: unknown) {
  if (direction !== -1 && direction !== 1) return fail("Invalid direction.");
  const store = await getProductStore(client, storeId);
  if (!store) return fail(NOT_FOUND.store);
  const ids = (
    await client.category.findMany({ where: { storeId: store.id }, orderBy: [{ position: "asc" }, { createdAt: "asc" }], select: { id: true } })
  ).map((c) => c.id);
  const index = ids.indexOf(categoryId);
  if (index < 0) return fail(NOT_FOUND.category);
  const target = index + direction;
  if (target < 0 || target >= ids.length) return ok({ id: categoryId });
  [ids[index], ids[target]] = [ids[target], ids[index]];
  // Rewrite positions 0..n-1 so the order is always clean.
  await client.$transaction(
    ids.map((id, position) => client.category.update({ where: { id_storeId: { id, storeId: store.id } }, data: { position } })),
  );
  return ok({ id: categoryId });
}

/**
 * Deletes a category of THIS store. If products use it they are first
 * moved to `moveProductsTo`, which must be another category of the same store.
 */
export async function deleteAdminCategory(
  client: PrismaClient,
  storeId: string,
  categoryId: string,
  moveProductsTo?: unknown,
): Promise<ActionResult<{ id: string }>> {
  const store = await getProductStore(client, storeId);
  if (!store) return fail(NOT_FOUND.store);
  const category = await client.category.findFirst({
    where: { id: categoryId, storeId: store.id },
    select: { id: true, _count: { select: { products: true } } },
  });
  if (!category) return fail(NOT_FOUND.category);

  let target: string | null = null;
  if (category._count.products > 0) {
    const other =
      typeof moveProductsTo === "string" && moveProductsTo !== categoryId
        ? await client.category.findFirst({ where: { id: moveProductsTo, storeId: store.id }, select: { id: true } })
        : null;
    if (!other) return fail("Choose another category of this store for this category's products.");
    target = other.id;
  }

  try {
    await client.$transaction(async (tx) => {
      if (target) {
        await tx.product.updateMany({ where: { storeId: store.id, categoryId }, data: { categoryId: target } });
      }
      await tx.category.delete({ where: { id_storeId: { id: categoryId, storeId: store.id } } });
    });
  } catch (error) {
    if (isRecordNotFound(error)) return fail(NOT_FOUND.category);
    throw error;
  }
  return ok({ id: categoryId }, "Category deleted.");
}
