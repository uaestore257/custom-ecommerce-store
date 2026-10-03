import { NextResponse, type NextRequest } from "next/server";
import { STORE_PORTAL_SELECTION_COOKIE } from "@/lib/auth/constants";
import { adminHostOf } from "@/lib/admin/store-access";
import { getSignedInUser } from "@/lib/server/auth/guards";
import { storePortalMemberships } from "@/lib/server/auth/store-access";
import { getDb } from "@/lib/server/db";
import { storeHostConfig } from "@/lib/store-host";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const host = adminHostOf(request.headers.get("host") ?? "", storeHostConfig());
  if (host.kind !== "store-portal") {
    return new Response("Not found", { status: 404 });
  }

  const user = await getSignedInUser();
  if (!user || user.isPlatformOwner) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  const formData = await request.formData();
  const storeId = formData.get("storeId");
  const membership = storeId
    && typeof storeId === "string"
    ? (await storePortalMemberships(getDb(), user.id)).find(({ store }) => store.id === storeId)
    : undefined;
  if (!membership) return new Response("Not found", { status: 404 });

  const response = NextResponse.redirect(
    new URL(`/admin/stores/${encodeURIComponent(membership.store.id)}`, request.url),
    303,
  );
  response.cookies.set(STORE_PORTAL_SELECTION_COOKIE, membership.store.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
  return response;
}
