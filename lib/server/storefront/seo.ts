import "server-only";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { matchStoreHost, storeHostConfig } from "@/lib/store-host";
import {
  buildStorefrontMetadata,
  storefrontOriginForSlug,
  type StorefrontSeoContext,
} from "@/lib/storefront-seo";
import { getRequestStorefront } from "./catalog";

export async function getPublicStorefrontSeoContext(): Promise<StorefrontSeoContext | null> {
  const host = (await headers()).get("host") ?? "";
  const match = matchStoreHost(host, storeHostConfig());
  if (match.kind !== "store") return null;

  const { catalog } = await getRequestStorefront();
  if (!catalog || catalog.store.slug !== match.slug) return null;

  const baseUrl = process.env.BETTER_AUTH_URL;
  if (!baseUrl) return null;
  const config = storeHostConfig();
  const origin = storefrontOriginForSlug(catalog.store, baseUrl, config);
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

