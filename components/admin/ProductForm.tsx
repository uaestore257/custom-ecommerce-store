"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { PackageX, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { ProductImage } from "@/components/ProductImage";
import { buttonClass, Card, errorProps, Field, inputClass, LinkButton, Notice, PageHeader } from "@/components/ui";
import { PRODUCT_STATUSES } from "@/lib/config";
import { createProduct, deleteProduct, isSkuTaken, updateProduct } from "@/lib/demo-db";
import type { Product, ProductStatus } from "@/lib/types";
import { hasErrors, isHttpUrl, type FieldErrors } from "@/lib/validation";
import { useSelectedStore } from "./StoreContext";

interface ProductFormValues {
  name: string;
  sku: string;
  categoryId: string;
  description: string;
  price: string;
  compareAtPrice: string;
  imageUrl: string;
  stock: string;
  status: ProductStatus;
  featured: boolean;
}

function toValues(product?: Product): ProductFormValues {
  return {
    name: product?.name ?? "",
    sku: product?.sku ?? "",
    categoryId: product?.categoryId ?? "",
    description: product?.description ?? "",
    price: product ? String(product.price) : "",
    compareAtPrice: product?.compareAtPrice ? String(product.compareAtPrice) : "",
    imageUrl: product?.imageUrl ?? "",
    stock: product ? String(product.stock) : "0",
    status: product?.status ?? "active",
    featured: product?.featured ?? false,
  };
}

/** Add (no productId) or edit a product of the selected store. */
export function ProductForm({ productId }: { productId?: string }) {
  const { store, data } = useSelectedStore();
  // Look the product up ONLY inside the selected store's data.
  const product = productId ? data.products.find((p) => p.id === productId) : undefined;
  const base = `/admin/stores/${store.id}`;

  if (productId && !product) {
    return (
      <EmptyState
        icon={PackageX}
        title="Product not found"
        description={`This product does not exist in ${store.name}.`}
        action={<LinkButton href={`${base}/products`}>Back to products</LinkButton>}
      />
    );
  }
  // key resets the form state if the product changes.
  return <ProductFormInner key={product?.id ?? "new"} product={product} />;
}

function ProductFormInner({ product }: { product?: Product }) {
  const router = useRouter();
  const { store, data } = useSelectedStore();
  const [values, setValues] = useState(() => toValues(product));
  const [errors, setErrors] = useState<FieldErrors<ProductFormValues>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saved, setSaved] = useState(false);
  const base = `/admin/stores/${store.id}`;
  const isEdit = Boolean(product);

  function set<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setSaved(false);
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(v: ProductFormValues) {
    const e: FieldErrors<ProductFormValues> = {};
    if (v.name.trim().length < 2) e.name = "Enter a product name.";
    if (!/^[A-Za-z0-9-_]{2,30}$/.test(v.sku.trim())) e.sku = "Use 2–30 letters, numbers, hyphens or underscores.";
    else if (isSkuTaken(data, v.sku, product?.id)) e.sku = "Another product in this store uses this SKU.";
    if (!data.categories.some((c) => c.id === v.categoryId)) e.categoryId = "Choose a category.";
    if (v.description.trim().length < 10) e.description = "Write at least 10 characters.";
    const price = Number(v.price);
    if (v.price.trim() === "" || !Number.isFinite(price) || price <= 0) e.price = "Enter a price greater than 0.";
    else if (!/^\d+(\.\d{1,2})?$/.test(v.price.trim())) e.price = "Use at most 2 decimal places.";
    const compareAt = v.compareAtPrice.trim();
    if (compareAt) {
      if (!/^\d+(\.\d{1,2})?$/.test(compareAt)) e.compareAtPrice = "Enter an amount with at most 2 decimal places.";
      else if (Number(compareAt) <= price) e.compareAtPrice = "Must be higher than the price, or leave empty.";
    }
    if (!/^\d+$/.test(v.stock.trim())) e.stock = "Enter a whole number (0 or more).";
    if (v.imageUrl.trim() && !isHttpUrl(v.imageUrl.trim())) e.imageUrl = "Enter a full URL starting with https://";
    return e;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (hasErrors(found)) {
      document.getElementById(`product-${Object.keys(found)[0]}`)?.focus();
      return;
    }
    const input = {
      name: values.name.trim(),
      sku: values.sku.trim().toUpperCase(),
      categoryId: values.categoryId,
      description: values.description.trim(),
      price: Number(values.price),
      compareAtPrice: values.compareAtPrice.trim() ? Number(values.compareAtPrice) : 0,
      imageUrl: values.imageUrl.trim(),
      stock: Number(values.stock),
      status: values.status,
      featured: values.featured,
    };
    if (product) {
      updateProduct(store.id, product.id, input);
      setSaved(true);
    } else {
      createProduct(store.id, input);
      router.push(`${base}/products`);
    }
  }

  const title = isEdit ? `Edit ${product?.name}` : "Add product";

  return (
    <>
      <PageHeader
        title={title}
        description={`This product belongs to ${store.name} and is only shown in its storefront.`}
        breadcrumbs={[
          { label: store.name, href: base },
          { label: "Products", href: `${base}/products` },
          { label: isEdit ? "Edit" : "New" },
        ]}
      />

      {data.categories.length === 0 && (
        <Notice tone="warning" className="mb-6">
          This store has no categories yet.{" "}
          <Link href={`${base}/categories`} className="font-semibold underline">Add a category</Link> first.
        </Notice>
      )}

      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Card className="p-5 sm:p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Product name" htmlFor="product-name" required error={errors.name} className="sm:col-span-2">
              <input {...errorProps("product-name", errors.name)} value={values.name} onChange={(e) => set("name", e.target.value)} className={inputClass(!!errors.name)} />
            </Field>
            <Field label="SKU" htmlFor="product-sku" required error={errors.sku} hint="Unique within this store.">
              <input {...errorProps("product-sku", errors.sku)} value={values.sku} onChange={(e) => set("sku", e.target.value)} className={inputClass(!!errors.sku)} />
            </Field>
            <Field label="Category" htmlFor="product-categoryId" required error={errors.categoryId}>
              <select {...errorProps("product-categoryId", errors.categoryId)} value={values.categoryId} onChange={(e) => set("categoryId", e.target.value)} className={inputClass(!!errors.categoryId)}>
                <option value="">Choose category…</option>
                {data.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Description" htmlFor="product-description" required error={errors.description} className="sm:col-span-2">
              <textarea {...errorProps("product-description", errors.description)} rows={4} value={values.description} onChange={(e) => set("description", e.target.value)} className={inputClass(!!errors.description)} />
            </Field>
            <Field label={`Price (${store.settings.currency})`} htmlFor="product-price" required error={errors.price}>
              <input {...errorProps("product-price", errors.price)} type="number" min="0" step="0.01" inputMode="decimal" value={values.price} onChange={(e) => set("price", e.target.value)} className={inputClass(!!errors.price)} />
            </Field>
            <Field
              label={`Original price (${store.settings.currency})`}
              htmlFor="product-compareAtPrice"
              error={errors.compareAtPrice}
              hint="Optional. Set higher than the price to show a SALE badge and the old price crossed out."
            >
              <input {...errorProps("product-compareAtPrice", errors.compareAtPrice)} type="number" min="0" step="0.01" inputMode="decimal" value={values.compareAtPrice} onChange={(e) => set("compareAtPrice", e.target.value)} className={inputClass(!!errors.compareAtPrice)} />
            </Field>
            <Field label="Stock quantity" htmlFor="product-stock" required error={errors.stock}>
              <input {...errorProps("product-stock", errors.stock)} type="number" min="0" step="1" inputMode="numeric" value={values.stock} onChange={(e) => set("stock", e.target.value)} className={inputClass(!!errors.stock)} />
            </Field>
            <Field label="Image URL" htmlFor="product-imageUrl" error={errors.imageUrl} hint="Optional. A placeholder is shown if empty or if the image fails to load." className="sm:col-span-2">
              <input {...errorProps("product-imageUrl", errors.imageUrl)} type="url" placeholder="https://…" value={values.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} className={inputClass(!!errors.imageUrl)} />
            </Field>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <Field label="Status" htmlFor="product-status" hint="Draft products are hidden from the storefront.">
              <select id="product-status" value={values.status} onChange={(e) => set("status", e.target.value as ProductStatus)} className={inputClass()}>
                {PRODUCT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
            <label className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={values.featured} onChange={(e) => set("featured", e.target.checked)} className="h-4 w-4 accent-teal-700" />
              Feature on homepage
            </label>
          </Card>
          <Card className="overflow-hidden">
            <ProductImage src={values.imageUrl.trim()} alt={values.name || "Product preview"} className="aspect-square w-full" />
            <p className="p-3 text-center text-xs text-slate-500">Image preview</p>
          </Card>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center lg:col-span-2">
          {isEdit && (
            <button type="button" className={`${buttonClass("ghost")} text-red-600 hover:bg-red-50 sm:mr-auto`} onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" aria-hidden />
              Delete product
            </button>
          )}
          <div className="flex flex-col-reverse gap-3 sm:ml-auto sm:flex-row sm:items-center">
            {saved && <p role="status" className="text-sm font-medium text-emerald-700">Product saved.</p>}
            <LinkButton href={`${base}/products`} variant="secondary">
              {saved ? "Back to products" : "Cancel"}
            </LinkButton>
            <button type="submit" className={buttonClass("primary")}>
              {isEdit ? "Save changes" : "Add product"}
            </button>
          </div>
        </div>
      </form>

      {product && (
        <ConfirmDialog
          open={confirmDelete}
          title={`Delete "${product.name}"?`}
          confirmLabel="Delete product"
          danger
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            // Go back to the product list, then remove the product.
            router.push(`${base}/products`);
            deleteProduct(store.id, product.id);
          }}
        >
          This removes the product from {store.name}. This cannot be undone.
        </ConfirmDialog>
      )}
    </>
  );
}
