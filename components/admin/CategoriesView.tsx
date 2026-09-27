"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Tags, Trash2 } from "lucide-react";
import {
  createCategoryAction,
  deleteCategoryAction,
  moveCategoryAction,
  updateCategoryAction,
} from "@/app/admin/actions";
import { CategoryImage } from "@/components/CategoryImage";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { buttonClass, Card, errorProps, Field, inputClass, Notice, PageHeader } from "@/components/ui";
import type { ActionResult, AdminCategory } from "@/lib/admin/types";
import { hasErrors, validateCategory } from "@/lib/admin/validation";
import { isHttpUrl } from "@/lib/validation";
import { useAdminStore } from "./StoreContext";

interface CategoryValues {
  name: string;
  imageUrl: string;
}

/** Categories of the selected store, loaded from and saved to the database. */
export function CategoriesView({ categories }: { categories: AdminCategory[] }) {
  const store = useAdminStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<AdminCategory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const base = `/admin/stores/${store.id}`;

  function move(categoryId: string, direction: -1 | 1) {
    startTransition(async () => {
      const result = await moveCategoryAction(store.id, categoryId, direction);
      setError(result.ok ? null : result.error);
    });
  }

  return (
    <>
      <PageHeader
        title="Categories"
        description={`Categories for ${store.name} only. The order here is the order shown in "Shop by Category" and in the shop filters.`}
        breadcrumbs={[
          { label: "Client stores", href: "/admin/stores" },
          { label: store.name, href: base },
          { label: "Categories" },
        ]}
      />
      <Notice className="mb-5">
        Categories are saved in the database. The public storefront still shows demo categories until it is connected.
      </Notice>
      {error && <Notice tone="warning" className="mb-5">{error}</Notice>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-label="Category list">
          {categories.length === 0 ? (
            <EmptyState
              icon={Tags}
              title="No categories yet"
              description="Add your first category using the form. Products need a category before they can be added."
            />
          ) : (
            <ol className="space-y-3">
              {categories.map((category, index) => {
                const count = category.productCount;
                return (
                  <li key={category.id}>
                    <Card className="overflow-hidden">
                      <div className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap sm:gap-4 sm:p-4">
                        <CategoryImage
                          src={category.imageUrl}
                          alt={category.name}
                          className="h-14 w-20 shrink-0 rounded-lg sm:h-16 sm:w-24"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-slate-900">{category.name}</p>
                          <p className="text-sm text-slate-500">
                            <Link href={`${base}/products`} className="hover:underline">
                              {count} {count === 1 ? "product" : "products"}
                            </Link>
                            {!category.imageUrl && " · No image"}
                          </p>
                        </div>
                        <div className="flex w-full shrink-0 items-center justify-end gap-0.5 border-t border-slate-100 pt-2 sm:w-auto sm:border-0 sm:pt-0">
                          <IconButton label={`Move ${category.name} up`} disabled={pending || index === 0} onClick={() => move(category.id, -1)}>
                            <ArrowUp className="h-4 w-4" aria-hidden />
                          </IconButton>
                          <IconButton label={`Move ${category.name} down`} disabled={pending || index === categories.length - 1} onClick={() => move(category.id, 1)}>
                            <ArrowDown className="h-4 w-4" aria-hidden />
                          </IconButton>
                          <IconButton
                            label={`Edit ${category.name}`}
                            onClick={() => setEditingId(editingId === category.id ? null : category.id)}
                            active={editingId === category.id}
                          >
                            <Pencil className="h-4 w-4" aria-hidden />
                          </IconButton>
                          <IconButton label={`Delete ${category.name}`} danger onClick={() => setToDelete(category)}>
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </IconButton>
                        </div>
                      </div>
                      {editingId === category.id && (
                        <div className="border-t border-slate-200 bg-slate-50 p-4">
                          <CategoryForm
                            key={category.id}
                            category={category}
                            submitLabel="Save changes"
                            onSubmit={async (values) => {
                              const result = await updateCategoryAction(store.id, category.id, values);
                              if (result.ok) setEditingId(null);
                              return result;
                            }}
                            onCancel={() => setEditingId(null)}
                          />
                        </div>
                      )}
                    </Card>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <aside>
          <Card className="p-5 lg:sticky lg:top-24">
            <h2 className="text-lg font-semibold">Add category</h2>
            <p className="mt-1 text-sm text-slate-600">New categories appear at the end of the list.</p>
            <div className="mt-4">
              <CategoryForm
                submitLabel="Add category"
                resetAfterSubmit
                onSubmit={(values) => createCategoryAction(store.id, values)}
              />
            </div>
          </Card>
        </aside>
      </div>

      {toDelete && (
        <DeleteCategoryDialog
          key={toDelete.id}
          category={toDelete}
          categories={categories}
          onCancel={() => setToDelete(null)}
          onConfirm={async (moveTo) => {
            const result = await deleteCategoryAction(store.id, toDelete.id, moveTo ?? null);
            setToDelete(null);
            if (result.ok) {
              if (editingId === toDelete.id) setEditingId(null);
              setError(null);
            } else setError(result.error);
          }}
        />
      )}
    </>
  );
}

function CategoryForm({
  category,
  submitLabel,
  resetAfterSubmit = false,
  onSubmit,
  onCancel,
}: {
  category?: AdminCategory;
  submitLabel: string;
  resetAfterSubmit?: boolean;
  onSubmit: (values: CategoryValues) => Promise<ActionResult<{ id: string }>>;
  onCancel?: () => void;
}) {
  const idPrefix = category ? `category-${category.id}` : "new-category";
  const [values, setValues] = useState<CategoryValues>({ name: category?.name ?? "", imageUrl: category?.imageUrl ?? "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [added, setAdded] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set(key: keyof CategoryValues, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    setAdded(null);
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validateCategory(values).errors;
    setErrors(found);
    if (hasErrors(found)) {
      document.getElementById(`${idPrefix}-${found.name ? "name" : "imageUrl"}`)?.focus();
      return;
    }
    startTransition(async () => {
      const result = await onSubmit({ name: values.name.trim(), imageUrl: values.imageUrl.trim() });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? { name: result.error });
        return;
      }
      if (resetAfterSubmit) {
        setAdded(values.name.trim());
        setValues({ name: "", imageUrl: "" });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <Field label="Category name" htmlFor={`${idPrefix}-name`} required error={errors.name}>
        <input
          {...errorProps(`${idPrefix}-name`, errors.name)}
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Accessories"
          className={inputClass(!!errors.name)}
        />
      </Field>
      <Field
        label="Image URL"
        htmlFor={`${idPrefix}-imageUrl`}
        error={errors.imageUrl}
        hint="Optional. A wide image works best. A styled placeholder is shown if empty or broken."
      >
        <input
          {...errorProps(`${idPrefix}-imageUrl`, errors.imageUrl)}
          type="url"
          value={values.imageUrl}
          onChange={(e) => set("imageUrl", e.target.value)}
          placeholder="https://…"
          className={inputClass(!!errors.imageUrl)}
        />
      </Field>
      {values.imageUrl.trim() && isHttpUrl(values.imageUrl.trim()) && (
        <CategoryImage src={values.imageUrl.trim()} alt={values.name || "Preview"} className="aspect-[16/10] w-full rounded-lg" />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {!category && <Plus className="h-4 w-4" aria-hidden />}
          {pending ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className={buttonClass("secondary")} onClick={onCancel}>
            Cancel
          </button>
        )}
        {added && (
          <p role="status" className="text-sm font-medium text-emerald-700">
            &ldquo;{added}&rdquo; added.
          </p>
        )}
      </div>
    </form>
  );
}

function DeleteCategoryDialog({
  category,
  categories,
  onCancel,
  onConfirm,
}: {
  category: AdminCategory;
  categories: AdminCategory[];
  onCancel: () => void;
  onConfirm: (moveProductsTo?: string) => Promise<void>;
}) {
  const others = categories.filter((c) => c.id !== category.id);
  const [moveTo, setMoveTo] = useState(others[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const productCount = category.productCount;
  const blocked = productCount > 0 && others.length === 0;

  return (
    <ConfirmDialog
      open
      title={`Delete "${category.name}"?`}
      confirmLabel={pending ? "Deleting…" : blocked ? "OK" : productCount > 0 ? "Move products and delete" : "Delete category"}
      danger={!blocked}
      onCancel={onCancel}
      onConfirm={() =>
        blocked ? onCancel() : startTransition(() => onConfirm(productCount > 0 ? moveTo : undefined))
      }
    >
      {productCount === 0 ? (
        <p>This category has no products. It will be removed.</p>
      ) : blocked ? (
        <p>
          This is the only category and it has {productCount} {productCount === 1 ? "product" : "products"}. Add
          another category first so the products can be moved there.
        </p>
      ) : (
        <div className="space-y-3">
          <p>
            {productCount} {productCount === 1 ? "product uses" : "products use"} this category. Choose where to
            move {productCount === 1 ? "it" : "them"}:
          </p>
          <label htmlFor="move-products-to" className="sr-only">Move products to</label>
          <select id="move-products-to" value={moveTo} onChange={(e) => setMoveTo(e.target.value)} className={inputClass()}>
            {others.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}
    </ConfirmDialog>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:cursor-not-allowed disabled:opacity-30 ${
        danger ? "hover:bg-red-50 hover:text-red-600" : "hover:bg-slate-100 hover:text-slate-900"
      } ${active ? "bg-slate-100 text-slate-900" : ""}`}
    >
      {children}
    </button>
  );
}
