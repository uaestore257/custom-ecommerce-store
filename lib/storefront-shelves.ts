// ---------------------------------------------------------------
// HOMEPAGE CATEGORY SHELVES — pure half (no database, no React)
//
// A template may DECLARE that its homepage wants products grouped by
// category (StorefrontTemplate.homepageShelves = { categories,
// perCategory }). The shared storefront core reads that declaration,
// clamps it to hard limits here, loads the products for the store being
// served (lib/server/storefront/catalog.ts → getHomepageShelves) and hands
// the template ready-made shelves. Templates never query the database.
//
// Absent or invalid declarations mean "no shelves": no query runs and the
// template receives an empty list, exactly as before shelves existed.
// ---------------------------------------------------------------
import type { StorefrontCategory, StorefrontProductSummary } from "./storefront-types";

/** What a template may request. Both values are whole numbers ≥ 1. */
export interface HomepageShelvesRequest {
  /** How many categories (in the store's category order) get a shelf. */
  categories: number;
  /** How many products each shelf shows at most. */
  perCategory: number;
}

/** One category with up to `perCategory` of its ACTIVE products (featured first, then newest). */
export interface StorefrontShelf {
  category: StorefrontCategory;
  products: StorefrontProductSummary[];
}

/** Hard ceilings, whatever a template declares: at most 8 × 12 = 96 products. */
export const MAX_SHELF_CATEGORIES = 8;
export const MAX_SHELF_PRODUCTS = 12;

/**
 * A safe request from a template's declaration, or null for "no shelves".
 * Missing, non-object, non-integer, non-finite or < 1 values give null;
 * values above the ceilings are clamped down to them.
 */
export function normalizeShelvesRequest(raw: unknown): HomepageShelvesRequest | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const { categories, perCategory } = raw as Record<string, unknown>;
  const whole = (value: unknown) => typeof value === "number" && Number.isInteger(value) && value >= 1;
  if (!whole(categories) || !whole(perCategory)) return null;
  return {
    categories: Math.min(categories as number, MAX_SHELF_CATEGORIES),
    perCategory: Math.min(perCategory as number, MAX_SHELF_PRODUCTS),
  };
}

/**
 * The categories that get a shelf: the store's own categories (already
 * store-scoped, in position order) that have a URL and ACTIVE products,
 * up to the requested number.
 */
export function shelfCategories(categories: StorefrontCategory[], request: HomepageShelvesRequest): StorefrontCategory[] {
  return categories.filter((category) => category.slug && category.productCount > 0).slice(0, request.categories);
}

/**
 * Shelves from loaded products, in category order. Defensive: products of
 * any other category (or store) are ignored, each shelf is cut to
 * `perCategory`, and categories left with no products are dropped.
 */
export function groupShelves(
  categories: StorefrontCategory[],
  products: StorefrontProductSummary[],
  perCategory: number,
  storeId: string,
): StorefrontShelf[] {
  const byCategory = new Map<string, StorefrontProductSummary[]>(categories.map((category) => [category.id, []]));
  for (const product of products) {
    if (product.storeId !== storeId) continue;
    const shelf = byCategory.get(product.categoryId);
    if (shelf && shelf.length < perCategory) shelf.push(product);
  }
  return categories
    .map((category) => ({ category, products: byCategory.get(category.id) ?? [] }))
    .filter((shelf) => shelf.products.length > 0);
}
