"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { createProductAction, deleteProductAction, updateProductAction } from "@/app/admin/actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ProductImage } from "@/components/ProductImage";
import { buttonClass, Card, errorProps, Field, inputClass, LinkButton, Notice, PageHeader } from "@/components/ui";
import type { AdminCategory, AdminProduct, DbProductStatus } from "@/lib/admin/types";
import { hasErrors, validateProduct } from "@/lib/admin/validation";
import { useAdminStore } from "./StoreContext";

interface ProductFormValues {
  name: string;
  sku: string;
  categoryId: string;
  description: string;
  price: string;
  compareAtPrice: string;
  imageUrl: string;
  stock: string;
  status: DbProductStatus;
  featured: boolean;
}

const STATUS_OPTIONS: { value: DbProductStatus; label: string; hint: string }[] = [
  { value: "ACTIVE", label: "Active", hint: "Visible to customers once the storefront uses the database." },
  { value: "DRAFT", label: "Draft", hint: "Hidden from customers." },
  { value: "ARCHIVED", label: "Archived", hint: "Hidden; kept for order history." },
];

function toValues(product?: AdminProduct): ProductFormValues {
  return {
    name: product?.name ?? "",
    sku: product?.sku ?? "",
    categoryId: product?.categoryId ?? "",
    description: product?.description ?? "",
    price: product?.price ?? "",
    compareAtPrice: product?.compareAtPrice ?? "",
    imageUrl: product?.imageUrl ?? "",
    stock: product ? String(product.stock) : "0",
    status: product?.status ?? "ACTIVE",
    featured: product?.featured ?? false,
  };
}

/**
 * Add (no product) or edit a product of the selected store. Saves through
 * Server Actions with the store id from the URL; the server validates
 * everything again and only touches products of this store.
 */
export function ProductForm({
  product,
  categories,
  minorUnits,
}: {
  product?: AdminProduct;
  categories: AdminCategory[];
  /** Decimal places of the store's currency (ISO 4217). */
  minorUnits: number;
}) {
  const router = useRouter();
  const store = useAdminStore();
  const [values, setValues] = useState(() => toValues(product));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const base = `/admin/stores/${store.id}`;
  const isEdit = Boolean(product);
  const step = minorUnits === 0 ? "1" : `0.${"0".repeat(minorUnits - 1)}1`;

  function set<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setSaved(false);
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const found = validateProduct(values, minorUnits).errors;
    setErrors(found);
    if (hasErrors(found)) {
      document.getElementById(`product-${Object.keys(found)[0]}`)?.focus();
      return;
    }
    startTransition(async () => {
      const result = product
        ? await updateProductAction(store.id, product.id, values)
        : await createProductAction(store.id, values);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.error);
        return;
      }
      if (product) setSaved(true);
      else router.push(`${base}/products`);
    });
  }

  function handleDelete() {
    if (!product) return;
    startTransition(async () => {
      const result = await deleteProductAction(store.id, product.id);
      setConfirmDelete(false);
      if (!result.ok) setFormError(result.error);
      else router.push(`${base}/products`);
    });
  }

  const title = isEdit ? `Edit ${product?.name}` : "Add product";

  return (
    <>
      <PageHeader
        title={title}
        description={`This product belongs to ${store.name}. Prices are in ${store.baseCurrency}.`}
        breadcrumbs={[
          { label: store.name, href: base },
          { label: "Products", href: `${base}/products` },
          { label: isEdit ? "Edit" : "New" },
        ]}
      />

      {categories.length === 0 && (
        <Notice tone="warning" className="mb-6">
          This store has no categories yet.{" "}
          <Link href={`${base}/categories`} className="font-semibold underline">Add a category</Link> first.
        </Notice>
      )}
      {formError && <Notice tone="warning" className="mb-6">{formError}</Notice>}

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
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Description" htmlFor="product-description" required error={errors.description} className="sm:col-span-2">
              <textarea {...errorProps("product-description", errors.description)} rows={4} value={values.description} onChange={(e) => set("description", e.target.value)} className={inputClass(!!errors.description)} />
            </Field>
            <Field label={`Price (${store.baseCurrency})`} htmlFor="product-price" required error={errors.price}>
              <input {...errorProps("product-price", errors.price)} type="number" min="0" step={step} inputMode="decimal" value={values.price} onChange={(e) => set("price", e.target.value)} className={inputClass(!!errors.price)} />
            </Field>
            <Field
              label={`Original price (${store.baseCurrency})`}
              htmlFor="product-compareAtPrice"
              error={errors.compareAtPrice}
              hint="Optional. Set higher than the price to show a SALE badge and the old price crossed out."
            >
              <input {...errorProps("product-compareAtPrice", errors.compareAtPrice)} type="number" min="0" step={step} inputMode="decimal" value={values.compareAtPrice} onChange={(e) => set("compareAtPrice", e.target.value)} className={inputClass(!!errors.compareAtPrice)} />
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
            <Field
              label="Status"
              htmlFor="product-status"
              error={errors.status}
              hint={STATUS_OPTIONS.find((s) => s.value === values.status)?.hint}
            >
              <select id="product-status" value={values.status} onChange={(e) => set("status", e.target.value as DbProductStatus)} className={inputClass(!!errors.status)}>
                {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
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
              {product?.hasOrders ? "Archive product" : "Delete product"}
            </button>
          )}
          <div className="flex flex-col-reverse gap-3 sm:ml-auto sm:flex-row sm:items-center">
            {saved && <p role="status" className="text-sm font-medium text-emerald-700">Product saved.</p>}
            <LinkButton href={`${base}/products`} variant="secondary">
              {saved ? "Back to products" : "Cancel"}
            </LinkButton>
            <button type="submit" disabled={pending} className={buttonClass("primary")}>
              {pending ? "Saving…" : isEdit ? "Save changes" : "Add product"}
            </button>
          </div>
        </div>
      </form>

      {product && (
        <ConfirmDialog
          open={confirmDelete}
          title={product.hasOrders ? `Archive "${product.name}"?` : `Delete "${product.name}"?`}
          confirmLabel={pending ? "Working…" : product.hasOrders ? "Archive product" : "Delete product"}
          danger
          onCancel={() => setConfirmDelete(false)}
          onConfirm={handleDelete}
        >
          {product.hasOrders
            ? "This product appears in past orders, so it will be archived (hidden) instead of deleted to keep order history."
            : `This permanently removes the product from ${store.name}. This cannot be undone.`}
        </ConfirmDialog>
      )}
    </>
  );
}
