export type StripeWebhookResult = "accepted" | "duplicate" | "invalid";
export type PaymentReturnStatus = "paid" | "pending" | "failed" | "cancelled" | "invalid";

export async function paymentReturnQuery(request: Request): Promise<URLSearchParams | null> {
  if (request.method === "GET") return new URL(request.url).searchParams;
  if (
    request.method === "POST" &&
    request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() ===
      "application/x-www-form-urlencoded"
  ) {
    return new URLSearchParams(await request.text());
  }
  return null;
}

export async function forwardStripeWebhookRequest(
  request: Request,
  providerAccountId: string,
  processWebhook: (providerAccountId: string, rawBody: string, headers: Headers) => Promise<StripeWebhookResult>,
): Promise<Response> {
  const result = await processWebhook(providerAccountId, await request.text(), request.headers);
  if (result === "invalid") return Response.json({ error: "Invalid webhook." }, { status: 400 });
  return Response.json({ received: true }, { status: 200 });
}

export function paymentReturnResponse(status: PaymentReturnStatus): Response {
  const message = {
    paid: ["Payment received", "Your payment was verified successfully."],
    pending: ["Payment pending", "Your payment is awaiting confirmation. You can safely return to the store."],
    failed: ["Payment failed", "The provider did not approve this payment. Your order remains unpaid."],
    cancelled: ["Checkout cancelled", "No payment was confirmed. You can return to checkout to try again."],
    invalid: ["Payment not verified", "We could not verify this payment. Please contact the store before trying again."],
  }[status];
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${message[0]}</title></head><body><main><h1>${message[0]}</h1><p>${message[1]}</p><a href="/checkout">Return to checkout</a></main></body></html>`;
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
