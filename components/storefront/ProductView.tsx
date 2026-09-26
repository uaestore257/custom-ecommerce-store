"use client";

import Link from "next/link";
import { useState } from "react";
import { PackageX } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { ProductImage } from "@/components/ProductImage";
import { Breadcrumbs, LinkButton } from "@/components/ui";
import { categoryName } from "@/lib/demo-db";
import { formatMoney } from "@/lib/format";
import { useStorefront } from "@/lib/storefront";
import { AddToCartButton, QuantitySelector } from "./CartControls";
import { ProductCard } from "./ProductCard";

export function ProductView({ productId }: { productId: string }) {
  const view = useStorefront();
  const [quantity, setQuantity] = useState(1);
  if (!view) return null;
  const { store, data, products, cartLines } = view;

  // Only products of the store being shown can be found here.
  const product = products.find((p) => p.id === productId);

  if (!product) {
    return (
      <main className="mx-auto max-w-xl px-4 py-20 sm:px-6">
        <EmptyState
          icon={PackageX}
          title="Product not found"
          description={`We couldn't find this product in ${store.name}. It may have been removed or the link may be wrong.`}
          action={<LinkButton href="/shop" tone="brand">Back to shop</LinkButton>}
        />
      </main>
    );
  }

  const category = categoryName(data, product.categoryId);
  const inCart = cartLines.find((l) => l.product.id === product.id)?.quantity ?? 0;
  const available = Math.max(0, product.stock - inCart);
  const safeQuantity = Math.min(quantity, Math.max(1, available));
  const related = products
    .filter((p) => p.categoryId === product.categoryId && p.id !== product.id)
    .slice(0, 3);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-14">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          { label: category, href: `/shop?category=${encodeURIComponent(product.categoryId)}` },
          { label: product.name },
        ]}
      />

      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          className="aspect-square w-full rounded-3xl border border-slate-200"
        />

        <div>
          <span className="inline-block rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
            {category}
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{product.name}</h1>
          <p className="mt-3 text-2xl font-semibold text-brand">
            {formatMoney(product.price, store.settings.currency)}
          </p>
          <p className="mt-6 leading-relaxed text-slate-600">{product.description}</p>

          <dl className="mt-6 grid grid-cols-2 gap-4 border-y border-slate-200 py-4 text-sm">
            <div>
              <dt className="text-slate-500">SKU</dt>
              <dd className="font-medium">{product.sku}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Availability</dt>
              <dd className={`font-medium ${product.stock > 0 ? "text-emerald-700" : "text-red-600"}`}>
                {product.stock > 0 ? `In stock (${product.stock})` : "Out of stock"}
              </dd>
            </div>
          </dl>

          {product.stock > 0 && (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              {available > 0 && (
                <QuantitySelector value={safeQuantity} max={available} onChange={setQuantity} />
              )}
              <AddToCartButton
                product={product}
                shownStoreId={store.id}
                quantity={safeQuantity}
                inCart={inCart}
                size="lg"
                className="sm:min-w-56"
              />
            </div>
          )}
          {inCart > 0 && (
            <p className="mt-3 text-sm text-slate-600">
              {inCart} already in your{" "}
              <Link href="/cart" className="font-semibold text-brand hover:underline">cart</Link>.
            </p>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-bold tracking-tight">More in {category}</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                shownStoreId={store.id}
                categoryName={category}
                currency={store.settings.currency}
                inCart={cartLines.find((l) => l.product.id === p.id)?.quantity ?? 0}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
