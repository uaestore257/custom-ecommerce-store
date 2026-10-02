import "server-only";
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

export async function getPublicStorefrontSeoContext(): Promise<StorefrontSeoContext | null> {
  const host = (await headers()).get("host") ?? "";
  const config = storeHostConfig();
  const match = matchStoreHost(host, config);
  const hostname = normalizeRequestHostname(host);
  const domain = hostname
    ? await getDb().storeDomain.findUnique({
        where: { hostname },
        select: { storeId: true, status: true },
      })
    : null;
  if (domain && domain.status !== "VERIFIED") return null;
  if (!domain && match.kind !== "store") return null;

  const { catalog } = await getRequestStorefront();
  if (!catalog) return null;
  if (domain && catalog.store.id !== domain.storeId) return null;
  if (!domain && match.kind === "store" && catalog.store.slug !== match.slug) return null;

  const baseUrl = process.env.BETTER_AUTH_URL;
  if (!baseUrl) return null;
  const primaryDomain = await getDb().storeDomain.findFirst({
    where: { storeId: catalog.store.id, status: "VERIFIED", isPrimary: true },
    select: { hostname: true },
  });
  const origin = primaryDomain
    ? storefrontOriginForDomain(primaryDomain.hostname, baseUrl, config)
    : storefrontOriginForSlug(catalog.store, baseUrl, config);
  return origin ? { store: catalog.store, origin, config } : null;
}

export async function storefrontPageMetadata(input: {
  title: string;
  description: string;
  path: string;
  imageUrl?: string | null;
}): Promise<Metadata> {
  const context = await getPublicStorefrontSeoContext();
  if (!context) return { robots: { index: false, follow: false } };
  return buildStorefrontMetadata(context, input);
}
