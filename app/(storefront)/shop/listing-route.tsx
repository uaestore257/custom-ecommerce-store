import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getDb } from "@/lib/server/db";
import { getRequestStorefront, getStorefrontProductListing } from "@/lib/server/storefront/catalog";
import { requireStorefrontPage } from "@/lib/server/storefront/page";
import { getPublicStorefrontSeoContext, storefrontPageMetadata } from "@/lib/server/storefront/seo";
import { storefrontMessages } from "@/lib/storefront-i18n";
import { buildBreadcrumbJsonLd, serializeJsonLd, storefrontCanonicalUrl } from "@/lib/storefront-seo";
import type { StorefrontCategory, StorefrontContext } from "@/lib/storefront-types";
import { categoryPath, listingHref, parseListingQuery } from "@/lib/storefront-urls";

// Shared by /shop and /shop/[category]: the category comes from THIS
// store's own context by slug, so another store's category can never be
// listed here.

type SearchParams = Record<string, string | string[] | undefined>;

function findCategory(context: StorefrontContext, slug: string | null): StorefrontCategory | null | undefined {
  if (slug === null) return null;
  return context.categories.find((category) => category.slug === slug);
}

export async function listingMetadata(categorySlug: string | null, searchParams: SearchParams): Promise<Metadata> {
  const [seo, context] = await Promise.all([getPublicStorefrontSeoContext(), getRequestStorefront()]);
  if (!seo || !context) return { title: "Shop", robots: { index: false, follow: false } };
  const category = findCategory(context, categorySlug);
  if (category === undefined) return { title: "Not found", robots: { index: false, follow: false } };
  const query = parseListingQuery(searchParams);
  const base = categoryPath(category);
  const { meta } = storefrontMessages(context.store);
  const metadata = await storefrontPageMetadata({
    title: category ? `${category.name} | ${seo.store.name}` : `${meta.shop} | ${seo.store.name}`,
    description: category ? meta.browseCategory(category.name, seo.store.name) : meta.browseAll(seo.store.name),
    // Sort is a view of the same page; pagination is a distinct page.
    path: listingHref(base, { page: query.page }),
  });
  // Search results are not indexed.
  return query.q ? { ...metadata, robots: { index: false, follow: true } } : metadata;
}

export async function ListingRoute({ categorySlug, searchParams }: { categorySlug: string | null; searchParams: SearchParams }) {
  const { context, template } = await requireStorefrontPage();

  // Old links: /shop?category=<category id> -> /shop/<slug>.
  const legacyId = typeof searchParams.category === "string" ? searchParams.category : null;
  if (categorySlug === null && legacyId) {
    const legacy = context.categories.find((category) => category.id === legacyId);
    if (legacy?.slug) permanentRedirect(categoryPath(legacy));
  }

  const category = findCategory(context, categorySlug);
  if (category === undefined) notFound();
  const query = parseListingQuery(searchParams);
  const listing = await getStorefrontProductListing(getDb(), context.store.id, category, query);
  if (!listing) notFound();
  if (listing.total > 0 && query.page > listing.pageCount) notFound();

  const seo = await getPublicStorefrontSeoContext();
  const breadcrumbData =
    seo && category
      ? serializeJsonLd(
          buildBreadcrumbJsonLd([
            { name: seo.store.name, url: storefrontCanonicalUrl(seo, "/") },
            { name: category.name, url: storefrontCanonicalUrl(seo, categoryPath(category)) },
          ]),
        )
      : null;
  const { Listing } = template;
  return (
    <>
      {breadcrumbData ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbData }} /> : null}
      <Listing {...context} listing={listing} />
    </>
  );
}
