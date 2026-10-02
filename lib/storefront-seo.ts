import type { Metadata, MetadataRoute } from "next";
import type { StorefrontCategory, StorefrontProduct, StorefrontStore } from "./storefront-types";
import { storefrontUrlForSlug, type StoreHostConfig } from "./store-host";

export interface StorefrontSeoContext {
  store: StorefrontStore;
  origin: URL;
  config: StoreHostConfig;
}

export function storefrontOriginForSlug(
  store: StorefrontStore,
  baseUrl: string,
  config: StoreHostConfig,
): URL | null {
  const value = storefrontUrlForSlug(store.slug, baseUrl, config);
  return value ? new URL(value) : null;
}

export function storefrontOriginForDomain(
  hostname: string,
  baseUrl: string,
  config: StoreHostConfig,
): URL | null {
  try {
    const url = new URL(baseUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    url.hostname = hostname;
    if (config.production) url.port = "";
    url.pathname = "/";
    url.search = "";
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

export function storefrontCanonicalUrl(context: StorefrontSeoContext, path: string): string {
  return new URL(path.replace(/^\/+/, ""), context.origin).toString();
}

function absolutePublicImageUrl(
  image: string | null | undefined,
  base: URL,
  adminHost: string,
): string | undefined {
  if (!image) return undefined;
  try {
    const url = new URL(image, base);
    const host = url.hostname.toLowerCase();
    const publicHost =
      host !== "localhost" &&
      host !== "admin" &&
      !host.endsWith(".localhost") &&
      !host.startsWith("admin.") &&
      url.host.toLowerCase() !== adminHost.toLowerCase();
    return publicHost && (url.protocol === "http:" || url.protocol === "https:")
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

function decimalAmount(minor: string, decimalPlaces: number): string {
  const amount = BigInt(minor);
  if (decimalPlaces === 0) return amount.toString();
  const divisor = 10n ** BigInt(decimalPlaces);
  const whole = amount / divisor;
  const fraction = (amount % divisor).toString().padStart(decimalPlaces, "0");
  return `${whole}.${fraction}`;
}

export function buildStorefrontMetadata(
  context: StorefrontSeoContext,
  input: {
    title: string;
    description: string;
    path: string;
    imageUrl?: string | null;
  },
): Metadata {
  const canonical = storefrontCanonicalUrl(context, input.path);
  const description = input.description.slice(0, 300);
  const image = absolutePublicImageUrl(
    input.imageUrl ?? context.store.logoUrl,
    context.origin,
    context.config.adminHost,
  );
  const images = image ? [{ url: image }] : undefined;

  return {
    title: { absolute: input.title },
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      title: input.title,
      description,
      siteName: context.store.name,
      ...(images ? { images } : {}),
    },
    other: { "twitter:url": canonical },
    twitter: image
      ? { card: "summary_large_image", title: input.title, description, images: [image] }
      : { card: "summary", title: input.title, description },
  };
}

export function buildStoreOrganizationJsonLd(
  context: StorefrontSeoContext,
  description: string,
): Record<string, unknown> {
  const logo = absolutePublicImageUrl(context.store.logoUrl, context.origin, context.config.adminHost);
  return {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    name: context.store.name,
    url: context.origin.toString(),
    description,
    ...(logo ? { logo } : {}),
  };
}

export function buildProductJsonLd(
  context: StorefrontSeoContext,
  product: StorefrontProduct,
): Record<string, unknown> {
  const url = storefrontCanonicalUrl(context, `/products/${encodeURIComponent(product.id)}`);
  const image = absolutePublicImageUrl(product.imageUrl, new URL(url), context.config.adminHost);
  const price = decimalAmount(product.priceMinor, context.store.minorUnits);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    url,
    ...(image ? { image } : {}),
    offers: {
      "@type": "Offer",
      price,
      priceCurrency: context.store.currency,
      url,
    },
  };
}

export function buildBreadcrumbJsonLd(
  items: Array<{ name: string; url: string }>,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map(({ name, url }, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name,
      item: url,
    })),
  };
}

export function serializeJsonLd(value: Record<string, unknown>): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function buildStorefrontSitemapUrls(
  context: StorefrontSeoContext,
  products: Pick<StorefrontProduct, "id">[],
  categories: Pick<StorefrontCategory, "id">[],
): string[] {
  return [
    storefrontCanonicalUrl(context, "/"),
    storefrontCanonicalUrl(context, "/shop"),
    ...categories.map((category) =>
      storefrontCanonicalUrl(context, `/shop?category=${encodeURIComponent(category.id)}`),
    ),
    ...products.map((product) =>
      storefrontCanonicalUrl(context, `/products/${encodeURIComponent(product.id)}`),
    ),
  ];
}

export function buildStorefrontRobots(
  isPublicStore: boolean,
  sitemapUrl?: string,
): MetadataRoute.Robots {
  if (!isPublicStore) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/login", "/accept-invitation", "/api", "/cart", "/checkout"],
    },
    ...(sitemapUrl ? { sitemap: sitemapUrl } : {}),
  };
}
