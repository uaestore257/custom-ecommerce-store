import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductView } from "@/components/storefront/ProductView";
import { getRequestStorefront, getRequestStorefrontProduct } from "@/lib/server/storefront/catalog";
import { getPublicStorefrontSeoContext, storefrontPageMetadata } from "@/lib/server/storefront/seo";
import { buildBreadcrumbJsonLd, buildProductJsonLd, serializeJsonLd, storefrontCanonicalUrl } from "@/lib/storefront-seo";

export async function generateMetadata({ params }: PageProps<"/products/[id]">): Promise<Metadata> {
  const { id } = await params;
  const context = await getPublicStorefrontSeoContext();
  if (!context) return { title: "Product not found", robots: { index: false, follow: false } };
  const product = await getRequestStorefrontProduct(id);
  if (!product) return { title: "Product not found", robots: { index: false, follow: false } };
  return storefrontPageMetadata({
    title: `${product.name} | ${context.store.name}`,
    description: product.description || `${product.name} from ${context.store.name}.`,
    path: `/products/${encodeURIComponent(product.id)}`,
    imageUrl: product.imageUrl,
  });
}

// Only an ACTIVE product of the store being shown is found; anything else
// (missing, draft, archived, or another store's) is a 404.
export default async function ProductPage({ params }: PageProps<"/products/[id]">) {
  const { id } = await params;
  const product = await getRequestStorefrontProduct(id);
  if (!product) notFound();
  const [context, { catalog }] = await Promise.all([getPublicStorefrontSeoContext(), getRequestStorefront()]);
  const productData = context ? serializeJsonLd(buildProductJsonLd(context, product)) : null;
  const category = catalog?.categories.find((item) => item.id === product.categoryId);
  const breadcrumbData =
    context && category
      ? serializeJsonLd(
          buildBreadcrumbJsonLd([
            { name: context.store.name, url: storefrontCanonicalUrl(context, "/") },
            {
              name: category.name,
              url: storefrontCanonicalUrl(context, `/shop?category=${encodeURIComponent(category.id)}`),
            },
            {
              name: product.name,
              url: storefrontCanonicalUrl(context, `/products/${encodeURIComponent(product.id)}`),
            },
          ]),
        )
      : null;
  return (
    <>
      {productData ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: productData }} /> : null}
      {breadcrumbData ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbData }} /> : null}
      <ProductView product={product} />
    </>
  );
}
