"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setStoreDemoAction, setStoreWorkOrderAction, setStoreWorkServiceCategoryAction } from "@/app/admin/actions";
import { buttonClass, Card, Notice } from "@/components/ui";
import { SERVICE_CATEGORIES } from "@/lib/platform/services";

export function StoreDemoControls({
  storeId,
  isDemo,
  workServiceSlug,
  workOrder,
  layout = "card",
}: {
  storeId: string;
  isDemo: boolean;
  workServiceSlug: string | null;
  workOrder: number | null;
  layout?: "card" | "inline";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [order, setOrder] = useState(workOrder === null ? "" : String(workOrder));
  function toggleDemo() {
    startTransition(async () => {
      setError("");
      const result = await setStoreDemoAction(storeId, !isDemo);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  function assignCategory(value: string) {
    startTransition(async () => {
      setError("");
      const result = await setStoreWorkServiceCategoryAction(storeId, value || null);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  function saveOrder() {
    const nextOrder = order.trim() === "" ? null : Number(order);
    if (nextOrder === workOrder) return;
    startTransition(async () => {
      setError("");
      const result = await setStoreWorkOrderAction(storeId, nextOrder);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  const controls = (
    <>
      <button type="button" disabled={pending} className={buttonClass(isDemo ? "secondary" : "primary")} onClick={toggleDemo}>
        {pending ? "Saving…" : isDemo ? "Remove from Demo" : "Use as a demo"}
      </button>
      <label className={layout === "inline" ? "min-w-48 text-sm font-medium text-slate-900" : "mt-4 block max-w-md text-sm font-medium text-slate-900"}>
        Work service category
        <select
          value={workServiceSlug ?? ""}
          disabled={pending}
          onChange={(event) => assignCategory(event.target.value)}
          className="mt-1 block min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
        >
          <option value="">Not assigned (hidden from Work)</option>
          {SERVICE_CATEGORIES.map((category) => (
            <option key={category.slug} value={category.slug}>{category.title}</option>
          ))}
        </select>
        <span className="mt-1 block font-normal text-slate-600">
          Only a demo store with an eligible storefront appears under its explicitly assigned Services category.
        </span>
      </label>
      <label className={layout === "inline" ? "min-w-32 text-sm font-medium text-slate-900" : "mt-4 block max-w-32 text-sm font-medium text-slate-900"}>
        Work display order
        <input
          type="number"
          min={1}
          max={9999}
          step={1}
          inputMode="numeric"
          value={order}
          disabled={pending}
          onChange={(event) => setOrder(event.target.value)}
          onBlur={saveOrder}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
          className="mt-1 block min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
          aria-label="Work display order"
        />
        <span className="mt-1 block font-normal text-slate-600">
          Lower numbers appear first within the assigned category. Blank numbers follow numbered stores.
        </span>
      </label>
    </>
  );

  return (
    <div>
      {layout === "card" ? (
        <Card className="mt-10 p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Template demo store</h2>
          <p className="mt-1 text-sm text-slate-600">
            {isDemo
              ? "This store is a live demo of its template: it shows a demonstration notice and is hidden from search engines."
              : "Opt this store into use as a live demo. Its products, orders and settings will be preserved."}
          </p>
          {error && <Notice tone="warning" className="mt-3">{error}</Notice>}
          <div className="mt-4 flex flex-wrap items-start gap-3">{controls}</div>
        </Card>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {controls}
          {error && <span role="status" className="basis-full text-sm text-rose-700">{error}</span>}
        </div>
      )}
    </div>
  );
}
