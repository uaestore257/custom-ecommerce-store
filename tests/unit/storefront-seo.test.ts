import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBreadcrumbJsonLd,
  buildProductJsonLd,
  buildStoreOrganizationJsonLd,
  buildStorefrontMetadata,
  buildStorefrontRobots,
  buildStorefrontSitemapUrls,
  serializeJsonLd,
  storefrontOriginForDomain,
  storefrontOriginForSlug,
  type StorefrontSeoContext,
} from "@/lib/storefront-seo";
import { storeHostConfig } from "@/lib/store-host";
import type { StorefrontProduct, StorefrontStore } from "@/lib/storefront-types";

const store: StorefrontStore = {
  id: "store-a",
  slug: "nest-and-oak",
  name: "Nest & Oak Home",
  logoUrl: "https://cdn.example.test/nest-and-oak.png",
  accentColor: "#0f766e",
  countryCode: "AE",
  countryName: "United Arab Emirates",
  currency: "AED",
  minorUnits: 2,
  locale: "en-AE",
  tagline: "Furniture for calm homes.",
  heroTitle: "Good things for your home",
  heroText: "Furniture and storage.",
  aboutText: "",
  contactEmail: "",
  contactPhone: "",
  contactAddress: "",
  paymentMethods: [],
};

const config = storeHostConfig({
  ADMIN_HOST: "admin.localhost:3000",
  PLATFORM_ROOT_DOMAIN: "localhost:3000",
  NODE_ENV: "development",
});
const origin = storefrontOriginForSlug(store, "http://admin.localhost:3000", config);
assert.ok(origin);
const context: StorefrontSeoContext = { store, origin, config };

const product: StorefrontProduct = {
  id: "product-1",
  storeId: "store-a",
  name: "Oak Table",
  description: "Solid oak table.",
  sku: "OAK-1",
  categoryId: "category-1",
  priceMinor: "125099",
  compareAtMinor: null,
  deliveryFeeMinor: "500",
  freeDelivery: false,
  pickupOnly: false,
  imageUrl: "https://cdn.example.test/oak-table.jpg",
  stock: 4,
  featured: true,
};

test("storefront origin and metadata use only the selected store host", () => {
  const metadata = buildStorefrontMetadata(context, {
    title: store.name,
    description: store.tagline,
    path: "/",
  });
  assert.equal(origin.toString(), "http://nest-and-oak.localhost:3000/");
  assert.deepEqual(metadata.alternates, { canonical: "http://nest-and-oak.localhost:3000/" });
  const title = metadata.title;
  assert.equal(title && typeof title === "object" && "absolute" in title ? title.absolute : title, store.name);
  assert.ok(JSON.stringify(metadata.openGraph).includes("http://nest-and-oak.localhost:3000/"));
  assert.ok(JSON.stringify(metadata.openGraph).includes(store.logoUrl));
});

test("production tenant canonical and discovery URLs never use the path-preview host", () => {
  const productionConfig = storeHostConfig({
    ADMIN_HOST: "admin.custom-ecommerce-store.vercel.app",
    PLATFORM_ROOT_DOMAIN: "custom-ecommerce-store.vercel.app",
    NODE_ENV: "production",
  });
  const productionOrigin = storefrontOriginForSlug(
    store,
    "https://admin.custom-ecommerce-store.vercel.app",
    productionConfig,
  );
  assert.equal(productionOrigin?.toString(), "https://nest-and-oak.custom-ecommerce-store.vercel.app/");
  const productionContext = { ...context, config: productionConfig, origin: productionOrigin! };
  const metadata = buildStorefrontMetadata(productionContext, {
    title: store.name,
    description: store.tagline,
    path: "/",
  });
  assert.deepEqual(metadata.alternates, {
    canonical: "https://nest-and-oak.custom-ecommerce-store.vercel.app/",
  });
  assert.equal(metadata.openGraph?.url, "https://nest-and-oak.custom-ecommerce-store.vercel.app/");
  assert.deepEqual(
    buildStorefrontSitemapUrls(productionContext, [], []),
    [
      "https://nest-and-oak.custom-ecommerce-store.vercel.app/",
      "https://nest-and-oak.custom-ecommerce-store.vercel.app/shop",
    ],
  );
});

test("a verified custom-domain origin preserves the development port and removes production ports", () => {
  const local = storefrontOriginForDomain("shop.example.test", "http://admin.localhost:3001", config);
  assert.equal(local?.toString(), "http://shop.example.test:3001/");

  const production = storefrontOriginForDomain(
    "shop.example.test",
    "https://admin.shops.test:8443",
    storeHostConfig({ PLATFORM_ROOT_DOMAIN: "shops.test", NODE_ENV: "production" }),
  );
  assert.equal(production?.toString(), "https://shop.example.test/");
});

test("storefront SEO URLs use the verified custom origin across metadata and discovery files", () => {
  const productionConfig = storeHostConfig({ PLATFORM_ROOT_DOMAIN: "shops.test", NODE_ENV: "production" });
  const customOrigin = storefrontOriginForDomain("shop.example.test", "https://admin.shops.test", productionConfig);
  assert.ok(customOrigin);
  const customContext = { ...context, origin: customOrigin, config: productionConfig };
  const metadata = buildStorefrontMetadata(customContext, {
    title: store.name,
    description: store.tagline,
    path: "/",
  });
  const canonical = "https://shop.example.test/";
  assert.deepEqual(metadata.alternates, { canonical });
  assert.equal(metadata.openGraph?.url, canonical);
  assert.equal(metadata.other?.["twitter:url"], canonical);
  assert.equal(buildStoreOrganizationJsonLd(customContext, store.tagline).url, canonical);
  assert.deepEqual(
    buildStorefrontSitemapUrls(customContext, [product], []),
    [canonical, "https://shop.example.test/shop", "https://shop.example.test/products/product-1"],
  );
  assert.deepEqual(
    buildStorefrontRobots(true, "https://shop.example.test/sitemap.xml"),
    {
      rules: {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/login", "/accept-invitation", "/api", "/cart", "/checkout"],
      },
      sitemap: "https://shop.example.test/sitemap.xml",
    },
  );
});

test("category metadata canonicalizes the existing store-scoped category route", () => {
  const metadata = buildStorefrontMetadata(context, {
    title: "Living Room | Nest & Oak Home",
    description: "Browse Living Room products.",
    path: "/shop?category=category-1",
  });
  assert.deepEqual(metadata.alternates, {
    canonical: "http://nest-and-oak.localhost:3000/shop?category=category-1",
  });
  assert.equal(metadata.description, "Browse Living Room products.");
});

test("product metadata uses its store canonical, Open Graph, and Twitter details", () => {
  const metadata = buildStorefrontMetadata(context, {
    title: `${product.name} | ${store.name}`,
    description: product.description,
    path: `/products/${encodeURIComponent(product.id)}`,
    imageUrl: product.imageUrl,
  });
  assert.deepEqual(metadata.alternates, {
    canonical: "http://nest-and-oak.localhost:3000/products/product-1",
  });
  assert.equal(metadata.description, product.description);
  assert.ok(JSON.stringify(metadata.openGraph).includes("https://cdn.example.test/oak-table.jpg"));
  assert.deepEqual(metadata.twitter, {
    card: "summary_large_image",
    title: "Oak Table | Nest & Oak Home",
    description: "Solid oak table.",
    images: ["https://cdn.example.test/oak-table.jpg"],
  });
});

test("product JSON-LD uses accurate store price and omits internal image URLs", () => {
  const productData = buildProductJsonLd(context, product);
  assert.equal(productData.url, "http://nest-and-oak.localhost:3000/products/product-1");
  assert.deepEqual(productData.offers, {
    "@type": "Offer",
    price: "1250.99",
    priceCurrency: "AED",
    url: "http://nest-and-oak.localhost:3000/products/product-1",
  });
  assert.equal(productData.image, product.imageUrl);

  const hiddenImage = buildProductJsonLd(context, { ...product, imageUrl: "http://admin.localhost/private.png" });
  assert.equal("image" in hiddenImage, false);
});

test("organization and breadcrumb JSON-LD are scoped to the store origin", () => {
  const organization = buildStoreOrganizationJsonLd(context, store.tagline);
  assert.equal(organization.url, "http://nest-and-oak.localhost:3000/");
  assert.equal(organization.logo, store.logoUrl);
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: store.name, url: "http://nest-and-oak.localhost:3000/" },
    { name: product.name, url: "http://nest-and-oak.localhost:3000/products/product-1" },
  ]);
  assert.deepEqual(
    (breadcrumb.itemListElement as Array<{ item: string }>).map(({ item }) => item),
    ["http://nest-and-oak.localhost:3000/", "http://nest-and-oak.localhost:3000/products/product-1"],
  );
  assert.equal(serializeJsonLd({ name: "</script>" }).includes("<"), false);
});

test("robots allow public storefront crawling but exclude private routes and non-store hosts", () => {
  const publicRobots = buildStorefrontRobots(true, "http://nest-and-oak.localhost:3000/sitemap.xml");
  assert.deepEqual(publicRobots.rules, {
    userAgent: "*",
    allow: "/",
    disallow: ["/admin", "/login", "/accept-invitation", "/api", "/cart", "/checkout"],
  });
  assert.equal(publicRobots.sitemap, "http://nest-and-oak.localhost:3000/sitemap.xml");
  assert.deepEqual(buildStorefrontRobots(false).rules, { userAgent: "*", disallow: "/" });
});

test("sitemap contains only URLs for the active store host", () => {
  const urls = buildStorefrontSitemapUrls(context, [{ id: product.id }], [{ id: "category-1" }]);
  assert.deepEqual(urls, [
    "http://nest-and-oak.localhost:3000/",
    "http://nest-and-oak.localhost:3000/shop",
    "http://nest-and-oak.localhost:3000/shop?category=category-1",
    "http://nest-and-oak.localhost:3000/products/product-1",
  ]);
  assert.equal(urls.some((url) => url.includes("admin.localhost") || url.includes("threadline")), false);
});
