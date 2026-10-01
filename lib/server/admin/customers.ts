import "server-only";
import type { AdminCustomerSummary } from "@/lib/admin/types";
import type { Client } from "./common";

const MAX_CUSTOMERS = 200;

/** Most recent customers from one non-archived store, or null if the store is unavailable. */
export async function listAdminCustomers(
  client: Client,
  storeId: string,
): Promise<{ customers: AdminCustomerSummary[]; hasMore: boolean } | null> {
  const store = await client.store.findFirst({
    where: { id: storeId, archivedAt: null },
    select: { id: true },
  });
  if (!store) return null;
  const rows = await client.customer.findMany({
    where: { storeId: store.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: MAX_CUSTOMERS + 1,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      createdAt: true,
      _count: { select: { orders: true } },
    },
  });
  return {
    customers: rows.slice(0, MAX_CUSTOMERS).map((customer) => ({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone ?? "",
      orderCount: customer._count.orders,
      createdAt: customer.createdAt.toISOString(),
    })),
    hasMore: rows.length > MAX_CUSTOMERS,
  };
}
