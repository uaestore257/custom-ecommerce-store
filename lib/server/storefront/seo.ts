import "server-only";
import { cache } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { normalizeRequestHostname } from "@/lib/store-domains";
import { matchStoreHost, storeHostConfig } from "@/lib/store-host";
import {
  buildStorefrontMetadata,
  storefrontOriginForDomain,
  storefrontOriginForSlug,
  type StorefrontSeoContext,
} from "@/lib/storefront-seo";
import { getRequestStorefront } from "./catalog";
import { getDb } from "../db";

/**
 * The SEO origin for this request's store: its verified primary custom
 * domain, else its platform host. Null on platform/admin hosts and for
 * non-public stores, so the platform root is never a store's canonical.
 */
export const getPublicStorefrontSeoContext = cache(async (): Promise<StorefrontSeoContext | null> => {
  const host = (await headers()).get("host") ?? "";
  const config = storeHostConfig();
  const match = matchStoreHost(host, config);
  if (match.kind === "platform" || match.kind === "store-admin") return null;
  const hostname = normalizeRequestHostname(host);
  const domain = hostname
    ? await getDb().storeDomain.findUnique({
        where: { hostname },
        select: { storeId: true, status: true },
      })
    : null;
  if (domain && domain.status !== "VERIFIED") return null;
  if (!domain && match.kind !== "store") return null;

  const storefront = await getRequestStorefront();
  if (!storefront) return null;
  if (domain && storefront.store.id !== domain.storeId) return null;
  if (!domain && match.kind === "store" && storefront.store.slug !== match.slug) return null;

  const baseUrl = process.env.BETTER_AUTH_URL;
  if (!baseUrl) return null;
  const primaryDomain = await getDb().storeDomain.findFirst({
    where: { storeId: storefront.store.id, status: "VERIFIED", isPrimary: true },
    select: { hostname: true },
  });
  const origin = primaryDomain
    ? storefrontOriginForDomain(primaryDomain.hostname, baseUrl, config)
    : storefrontOriginForSlug(storefront.store, baseUrl, config);
  return origin ? { store: storefront.store, origin, config } : null;
});

export async function storefrontPageMetadata(input: {
  title: string;
  description: string;
  path: string;
  imageUrl?: string | null;
}): Promise<Metadata> {
  const context = await getPublicStorefrontSeoContext();
  if (!context) return { robots: { index: false, follow: false } };
  const metadata = buildStorefrontMetadata(context, input);
  // Demo stores are real tenants but are never indexed.
  return context.store.isDemo ? { ...metadata, robots: { index: false, follow: true } } : metadata;
}
