import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import {
  completeStripeConnectOAuth,
  consumeStripeConnectOAuthError,
  stripeConnectOwnerSettingsUrl,
  stripeConnectOwnerSettingsUrlForStore,
} from "@/lib/server/payments/stripe-connect";

function redirectWithStatus(url: string, status: "connected" | "cancelled" | "failed") {
  const target = new URL(url);
  target.searchParams.set("stripeConnect", status);
  return NextResponse.redirect(target);
}

function fallbackUrl() {
  const baseUrl = process.env.BETTER_AUTH_URL;
  if (!baseUrl) return null;
  try {
    return new URL("/", baseUrl).toString();
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const state = params.get("state");
  const error = params.get("error");

  try {
    if (error) {
      const consumed = await consumeStripeConnectOAuthError(getDb(), state);
      const returnUrl = consumed
        ? await stripeConnectOwnerSettingsUrlForStore(getDb(), consumed.storeId)
        : null;
      if (returnUrl) return redirectWithStatus(returnUrl, "cancelled");
      const fallback = fallbackUrl();
      return fallback
        ? redirectWithStatus(fallback, "failed")
        : NextResponse.json({ error: "Stripe connection could not be completed." }, { status: 503 });
    }

    const result = await completeStripeConnectOAuth(getDb(), state, params.get("code"));
    const returnUrl = result.storeSlug ? stripeConnectOwnerSettingsUrl(result.storeSlug) : null;
    if (returnUrl) return redirectWithStatus(returnUrl, result.ok ? "connected" : "failed");
  } catch (cause) {
    console.error("[stripe connect callback] Connection could not be completed", cause);
  }

  const fallback = fallbackUrl();
  return fallback
    ? redirectWithStatus(fallback, "failed")
    : NextResponse.json({ error: "Stripe connection could not be completed." }, { status: 503 });
}
