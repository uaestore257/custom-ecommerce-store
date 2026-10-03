import { NextResponse, type NextRequest } from "next/server";
import { STOREFRONT_STORE_COOKIE } from "@/lib/storefront-cookie";
import { isStorefrontPathPreviewHost } from "@/lib/store-host";
import { getDb } from "@/lib/server/db";
import { resolveStorefrontPreviewId } from "@/lib/server/storefront/preview";

function notFound() {
  return new NextResponse("Not found", { status: 404, headers: { "content-type": "text/plain" } });
}

export async function GET(request: NextRequest, { params }: RouteContext<"/preview/[slug]">) {
  if (!isStorefrontPathPreviewHost(request.headers.get("host") ?? "")) return notFound();

  const { slug } = await params;
  const storeId = await resolveStorefrontPreviewId(getDb(), slug);
  if (!storeId) return notFound();

  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set(STOREFRONT_STORE_COOKIE, storeId, {
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
  });
  return response;
}
