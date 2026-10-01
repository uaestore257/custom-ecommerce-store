import type { Metadata } from "next";
import { ShopView } from "@/components/storefront/ShopView";
import { getRequestStorefront } from "@/lib/server/storefront/catalog";
import { getPublicStorefrontSeoContext, storefrontPageMetadata } from "@/lib/server/storefront/seo";
import { buildBreadcrumbJsonLd, serializeJsonLd, storefrontCanonicalUrl } from "@/lib/storefront-seo";

export async function generateMetadata({ searchParams }: PageProps<"/shop">): Promise<Metadata> {
  const [{ category }, context] = await Promise.all([searchParams, getPublicStorefrontSeoContext()]);
  if (!context) return { title: "Shop", robots: { index: false, follow: false } };
  const { catalog } = await getRequestStorefront();
  const categoryRecord = typeof category === "string"
    ? catalog?.categories.find((item) => item.id === category)
    : undefined;
  const path = categoryRecord
    ? `/shop?category=${encodeURIComponent(categoryRecord.id)}`
    : "/shop";
  return storefrontPageMetadata({
    title: categoryRecord
      ? `${categoryRecord.name} | ${context.store.name}`
      : `Shop | ${context.store.name}`,
    description: categoryRecord
      ? `Browse ${categoryRecord.name} products from ${context.store.name}.`
      : `Browse all products from ${context.store.name}.`,
    path,
  });
}

export default async function ShopPage({ searchParams }: PageProps<"/shop">) {
  // /shop?category=<categoryId> pre-selects a category (used by the homepage).
  const { category } = await searchParams;
  const [context, { catalog }] = await Promise.all([getPublicStorefrontSeoContext(), getRequestStorefront()]);
  const categoryRecord = typeof category === "string"
    ? catalog?.categories.find((item) => item.id === category)
    : undefined;
  const breadcrumbData =
    context && categoryRecord
      ? serializeJsonLd(
          buildBreadcrumbJsonLd([
            { name: context.store.name, url: storefrontCanonicalUrl(context, "/") },
            {
              name: categoryRecord.name,
              url: storefrontCanonicalUrl(context, `/shop?category=${encodeURIComponent(categoryRecord.id)}`),
            },
          ]),
        )
      : null;
  return (
    <>
      {breadcrumbData ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbData }} /> : null}
      <ShopView initialCategory={typeof category === "string" ? category : ""} />
    </>
  );
}
