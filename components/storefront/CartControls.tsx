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
    "flex h-9 w-9 items-center justify-center text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand";
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
      <span className="w-10 text-center text-sm font-semibold tabular-nums" aria-live="polite">
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
  className = "",
}: {
  product: Product;
  shownStoreId: string;
  quantity?: number;
  /** How many of this product are already in the cart. */
  inCart?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 2000);
    return () => clearTimeout(timer);
  }, [message]);

  if (product.stock <= 0) {
    return (
      <button type="button" disabled className={`${buttonClass("secondary", { size })} ${className}`}>
        Out of stock
      </button>
    );
  }

  const reachedLimit = inCart >= product.stock;

  return (
    <div className={className}>
      <button
        type="button"
        disabled={reachedLimit}
        className={`${buttonClass("primary", { size, tone: "brand" })} w-full`}
        onClick={() => {
          const result = addToCart(product, quantity, shownStoreId);
          if (result.ok) setMessage("Added to cart");
          else if (result.reason === "out-of-stock") setMessage("No more stock available");
          else setMessage("This product belongs to another store");
        }}
      >
        {message === "Added to cart" ? (
          <Check className="h-4 w-4" aria-hidden />
        ) : (
          <ShoppingCart className="h-4 w-4" aria-hidden />
        )}
        {reachedLimit ? "All stock in cart" : message === "Added to cart" ? "Added" : "Add to cart"}
      </button>
      <p className="sr-only" aria-live="polite">
        {message ?? ""}
      </p>
      {message && message !== "Added to cart" && (
        <p className="mt-1.5 text-xs text-red-600">{message}</p>
      )}
    </div>
  );
}
