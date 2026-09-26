"use client";

import { useEffect, useState } from "react";
import { Check, Minus, Plus, ShoppingCart } from "lucide-react";
import { buttonClass } from "@/components/ui";
import { addToCart } from "@/lib/storefront";
import type { Product } from "@/lib/types";

export function QuantitySelector({
  value,
  min = 1,
  max,
  onChange,
  label = "Quantity",
}: {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  label?: string;
}) {
  const button =
    "flex h-11 w-11 items-center justify-center sm:h-10 sm:w-10 text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand";
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex items-center overflow-hidden rounded-lg border border-slate-300 bg-white"
    >
      <button
        type="button"
        className={button}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease quantity"
      >
        <Minus className="h-4 w-4" aria-hidden />
      </button>
      <span className="w-9 text-center text-sm font-semibold tabular-nums sm:w-10" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={button}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        <Plus className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

export function AddToCartButton({
  product,
  shownStoreId,
  quantity = 1,
  inCart = 0,
  size = "md",
  compact = false,
  className = "",
}: {
  product: Product;
  shownStoreId: string;
  quantity?: number;
  /** How many of this product are already in the cart. */
  inCart?: number;
  size?: "sm" | "md" | "lg";
  /** Smaller button with short labels, for narrow product cards. */
  compact?: boolean;
  className?: string;
}) {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 2000);
    return () => clearTimeout(timer);
  }, [message]);

  // Compact: fits a half-width phone card but keeps a 40px tap target.
  const sizing = compact
    ? "min-h-10 w-full gap-1.5 rounded-lg px-2 text-xs font-semibold sm:text-sm"
    : "w-full";
  const base = compact
    ? "inline-flex items-center justify-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    : "";

  if (product.stock <= 0) {
    return (
      <div className={className}>
        <button
          type="button"
          disabled
          className={compact ? `${base} ${sizing} border border-slate-300 bg-white text-slate-500` : `${buttonClass("secondary", { size })} w-full`}
        >
          Out of stock
        </button>
      </div>
    );
  }

  const reachedLimit = inCart >= product.stock;
  const added = message === "Added to cart";
  const label = reachedLimit
    ? compact ? "Max in cart" : "All stock in cart"
    : added ? "Added" : "Add to cart";

  return (
    <div className={className}>
      <button
        type="button"
        disabled={reachedLimit}
        className={
          compact
            ? `${base} ${sizing} bg-brand text-white hover:bg-brand/90 focus-visible:ring-brand`
            : `${buttonClass("primary", { size, tone: "brand" })} ${sizing}`
        }
        onClick={() => {
          const result = addToCart(product, quantity, shownStoreId);
          if (result.ok) setMessage("Added to cart");
          else if (result.reason === "out-of-stock") setMessage("No more stock available");
          else setMessage("This product belongs to another store");
        }}
      >
        {added ? (
          <Check className={`h-4 w-4 shrink-0 ${compact ? "max-[359px]:hidden" : ""}`} aria-hidden />
        ) : (
          <ShoppingCart className={`h-4 w-4 shrink-0 ${compact ? "max-[359px]:hidden" : ""}`} aria-hidden />
        )}
        <span className="truncate">{label}</span>
      </button>
      <p className="sr-only" aria-live="polite">
        {message ?? ""}
      </p>
      {message && !added && <p className="mt-1.5 text-xs text-red-600">{message}</p>}
    </div>
  );
}
