import "server-only";
import type { AdminOrderSummary } from "@/lib/admin/types";
import { formatMinorUnits } from "@/lib/money";
import { storeFormatLocale } from "@/lib/standards";
import type { Client } from "./common";

// ---------------------------------------------------------------
// ORDERS (admin, read-only) — always inside ONE store.
// The storeId comes from the route; only that store's orders are read,
// newest first. Callers must already have passed requireAdminPage().
// ---------------------------------------------------------------

const MAX_ROWS = 200;

/** Orders of the store, newest first, or null if the store is missing/archived. */
export async function listAdminOrders(client: Client, storeId: string): Promise<AdminOrderSummary[] | null> {
  const store = await client.store.findFirst({
    where: { id: storeId, archivedAt: null },
    select: { id: true, orderNumberPrefix: true, defaultLanguage: true, countryCode: true, formatLocale: true },
  });
  if (!store) return null;
  const locale = storeFormatLocale(store);

  const orders = await client.order.findMany({
    where: { storeId: store.id },
    orderBy: [{ placedAt: "desc" }, { id: "desc" }],
    take: MAX_ROWS,
    include: {
      currencyRef: { select: { minorUnits: true } },
      items: { select: { quantity: true } },
    },
  });

  return orders.map((order) => ({
    id: order.id,
    number: store.orderNumberPrefix ? `${store.orderNumberPrefix}-${order.number}` : String(order.number),
    placedAt: order.placedAt.toISOString(),
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone ?? "",
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    totalDisplay: formatMinorUnits(order.totalMinor, order.currency, order.currencyRef.minorUnits, locale),
    paymentMethod: order.paymentMethod ?? "",
    paymentStatus: order.paymentStatus,
    status: order.status,
    isSample: order.isDemo,
  }));
}
