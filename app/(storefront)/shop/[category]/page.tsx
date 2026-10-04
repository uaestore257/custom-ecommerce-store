import type { Metadata } from "next";
import { ListingRoute, listingMetadata } from "../listing-route";

export async function generateMetadata({ params, searchParams }: PageProps<"/shop/[category]">): Promise<Metadata> {
  const [{ category }, query] = await Promise.all([params, searchParams]);
  return listingMetadata(category, query);
}

/** One of this store's categories by slug: /shop/<slug>?q=&sort=&page=. */
export default async function CategoryPage({ params, searchParams }: PageProps<"/shop/[category]">) {
  const [{ category }, query] = await Promise.all([params, searchParams]);
  return <ListingRoute categorySlug={category} searchParams={query} />;
}
