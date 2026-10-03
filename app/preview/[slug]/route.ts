import { NextResponse, type NextRequest } from "next/server";
import { STOREFRONT_STORE_COOKIE } from "@/lib/storefront-cookie";
import {
  isStorefrontPathPreviewHost,
  storefrontPreviewUrlForSlug,
  storeHostConfig,
} from "@/lib/store-host";
import { getDb } from "@/lib/server/db";
import { resolveStorefrontPreviewId } from "@/lib/server/storefront/preview";

function notFound() {
  return new NextResponse("Not found", { status: 404, headers: { "content-type": "text/plain" } });
}

export async function GET(request: NextRequest, { params }: RouteContext<"/preview/[slug]">) {
  if (!isStorefrontPathPreviewHost(request.headers.get("host") ?? "")) return notFound();

  const { slug } = await params;
  const db = getDb();
  const storeId = await resolveStorefrontPreviewId(db, slug);
  if (!storeId) return notFound();

  const store = await db.store.findFirst({
    where: { id: storeId, status: "ACTIVE", archivedAt: null },
    select: {
      slug: true,
      domains: {
        where: { status: "VERIFIED", isPrimary: true },
        select: { hostname: true },
        take: 1,
      },
    },
  });
  if (!store) return notFound();
  const publicUrl = storefrontPreviewUrlForSlug(
    store.slug,
    process.env.BETTER_AUTH_URL ?? "",
    storeHostConfig(),
    store.domains[0]?.hostname,
  );
  if (publicUrl) {
    const target = new URL(publicUrl);
    if (target.origin !== new URL(request.url).origin || target.pathname !== new URL(request.url).pathname) {
      return NextResponse.redirect(target);
    }
  }

  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set(STOREFRONT_STORE_COOKIE, storeId, {
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
  });
  return response;
}
