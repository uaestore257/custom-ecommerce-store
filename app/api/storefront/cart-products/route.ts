import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/server/db";
import { getCartProducts, MAX_CART_PRODUCTS, resolveStoreForHost } from "@/lib/server/storefront/catalog";
import { storeIdFromCookieHeader } from "@/lib/storefront-cookie";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------
// GET /api/storefront/cart-products?ids=a,b,c
//
// Fresh public data (price, stock, delivery) for exactly the products in a
// shopper's browser cart, so the storefront never ships the whole catalogue
// to the browser. Read-only and anonymous. The store is resolved from the
// request Host on the server, exactly like checkout; ids that are not
// ACTIVE products of THAT store are silently left out. Checkout re-checks
// everything again when an order is placed.
// ---------------------------------------------------------------

const NO_STORE = { "cache-control": "no-store" };

export async function GET(request: NextRequest) {
  const db = getDb();
  const storeId = await resolveStoreForHost(
    db,
    request.headers.get("host") ?? "",
    storeIdFromCookieHeader(request.headers.get("cookie")),
  );
  if (!storeId) return NextResponse.json({ products: [] }, { status: 404, headers: NO_STORE });

  const raw = request.nextUrl.searchParams.get("ids") ?? "";
  if (raw.length > MAX_CART_PRODUCTS * 65) {
    return NextResponse.json({ products: [] }, { status: 400, headers: NO_STORE });
  }
  const products = await getCartProducts(db, storeId, raw.split(","));
  return NextResponse.json({ storeId, products }, { headers: NO_STORE });
}
