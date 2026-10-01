import { forwardStripeWebhookRequest } from "@/lib/server/payments/http";
import { handleStripeWebhook } from "@/lib/server/payments/service";
import { getDb } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ providerAccountId: string }> },
) {
  const { providerAccountId } = await params;
  return forwardStripeWebhookRequest(request, providerAccountId, (accountId, rawBody, headers) =>
    handleStripeWebhook(getDb(), accountId, rawBody, headers),
  );
}
