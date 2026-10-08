import { forwardStripeWebhookRequest } from "@/lib/server/payments/http";
import { handleStripeConnectWebhook } from "@/lib/server/payments/service";
import { getDb } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return forwardStripeWebhookRequest(request, "connect", (_accountId, rawBody, headers) =>
    handleStripeConnectWebhook(getDb(), rawBody, headers),
  );
}
