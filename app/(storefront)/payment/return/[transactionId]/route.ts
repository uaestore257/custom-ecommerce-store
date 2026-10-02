import { getDb } from "@/lib/server/db";
import { verifyProviderReturn } from "@/lib/server/payments/service";
import { resolveStoreForHost } from "@/lib/server/storefront/catalog";
import { storeIdFromCookieHeader } from "@/lib/storefront-cookie";
import { paymentReturnQuery, paymentReturnResponse } from "@/lib/server/payments/http";

export const dynamic = "force-dynamic";

async function handlePaymentReturn(
  request: Request,
  { params }: { params: Promise<{ transactionId: string }> },
) {
  const { transactionId } = await params;
  const query = await paymentReturnQuery(request);
  if (!query) return paymentReturnResponse("invalid");
  if (query.get("cancelled") === "1") {
    return paymentReturnResponse("cancelled");
  }

  const db = getDb();
  const storeId = await resolveStoreForHost(
    db,
    request.headers.get("host") ?? "",
    storeIdFromCookieHeader(request.headers.get("cookie")),
  );
  if (!storeId) return paymentReturnResponse("invalid");

  const result = await verifyProviderReturn(db, storeId, transactionId, query);
  return paymentReturnResponse(result);
}

export async function GET(request: Request, context: { params: Promise<{ transactionId: string }> }) {
  return handlePaymentReturn(request, context);
}

export async function POST(request: Request, context: { params: Promise<{ transactionId: string }> }) {
  return handlePaymentReturn(request, context);
}
