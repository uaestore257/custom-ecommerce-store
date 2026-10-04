import type { Metadata } from "next";
import { ListingRoute, listingMetadata } from "./listing-route";

export async function generateMetadata({ searchParams }: PageProps<"/shop">): Promise<Metadata> {
  return listingMetadata(null, await searchParams);
}

/** All products: /shop?q=&sort=&page= (bounded pages, rendered by the store's template). */
export default async function ShopPage({ searchParams }: PageProps<"/shop">) {
  return <ListingRoute categorySlug={null} searchParams={await searchParams} />;
}
