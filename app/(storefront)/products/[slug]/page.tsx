import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getDb } from "@/lib/server/db";
import {
  getRelatedProducts,
  getRequestStorefrontProductBySlug,
  getStorefrontProduct,
} from "@/lib/server/storefront/catalog";
import { requireStorefrontPage } from "@/lib/server/storefront/page";
import { getPublicStorefrontSeoContext, storefrontPageMetadata } from "@/lib/server/storefront/seo";
import { buildBreadcrumbJsonLd, buildProductJsonLd, serializeJsonLd, storefrontCanonicalUrl } from "@/lib/storefront-seo";
import { categoryPath, productPath } from "@/lib/storefront-urls";

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const context = await getPublicStorefrontSeoContext();
  if (!context) return { title: "Product not found", robots: { index: false, follow: false } };
  const product = await getRequestStorefrontProductBySlug(slug);
  if (!product) return { title: "Product not found", robots: { index: false, follow: false } };
  return storefrontPageMetadata({
    title: `${product.name} | ${context.store.name}`,
    description: product.description || `${product.name} from ${context.store.name}.`,
    path: productPath(product),
    imageUrl: product.imageUrl,
  });
}

// /products/<slug>, resolved ONLY among this host's store's ACTIVE
// products (missing, draft, archived or another store's -> 404). Old
// /products/<id> links and non-canonical slugs redirect permanently.
export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const { context, template } = await requireStorefrontPage();
  const product = await getRequestStorefrontProductBySlug(slug);
  if (!product) {
    const legacy = await getStorefrontProduct(getDb(), context.store.id, slug);
    if (legacy) permanentRedirect(productPath(legacy));
    notFound();
  }
  if (product.slug && product.slug !== slug) permanentRedirect(productPath(product));

  const category = context.categories.find((item) => item.id === product.categoryId) ?? null;
  const [seo, related] = await Promise.all([
    getPublicStorefrontSeoContext(),
    getRelatedProducts(getDb(), context.store.id, product, template.relatedProductCount),
  ]);
  const productData = seo ? serializeJsonLd(buildProductJsonLd(seo, product)) : null;
  const breadcrumbData = seo
    ? serializeJsonLd(
        buildBreadcrumbJsonLd([
          { name: seo.store.name, url: storefrontCanonicalUrl(seo, "/") },
          ...(category?.slug ? [{ name: category.name, url: storefrontCanonicalUrl(seo, categoryPath(category)) }] : []),
          { name: product.name, url: storefrontCanonicalUrl(seo, productPath(product)) },
        ]),
      )
    : null;
  const { Product } = template;
  return (
    <>
      {productData ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: productData }} /> : null}
      {breadcrumbData ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbData }} /> : null}
      <Product {...context} product={product} category={category} related={related} />
    </>
  );
}
