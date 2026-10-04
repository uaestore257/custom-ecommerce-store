"use client";

import { useEffect, useState } from "react";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import { addToCart, useQuantityInCart, useStorefrontMessages } from "@/lib/storefront";
import type { CartProductRef } from "@/lib/storefront-types";
import { sfButtonClass } from "./primitives";

// Shared cart behaviour for every template. Templates choose the look
// (variant, size, labels); adding to the cart always goes through
// lib/storefront.ts, which refuses another store's products.

export function QuantitySelector({
  value,
  min = 1,
  max,
  onChange,
  label,
  className = "",
}: {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  label?: string;
  className?: string;
}) {
  const t = useStorefrontMessages();
  const button =
    "flex h-11 w-11 items-center justify-center text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus sm:h-10 sm:w-10";
  return (
    <div
      role="group"
      aria-label={label ?? t.quantity}
      className={`inline-flex items-center overflow-hidden rounded-control border-[length:var(--sf-control-border-width)] border-border bg-surface ${className}`}
    >
      <button
        type="button"
        className={button}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={t.decreaseQuantity}
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
        aria-label={t.increaseQuantity}
      >
        <Plus className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

// A compact button is at least 2.5rem tall, or its size's control height
// if that is taller. Important so it wins over the size's own min-height.
const COMPACT_MIN_HEIGHT = {
  sm: "min-h-[max(2.5rem,var(--sf-control-height-sm))]!",
  md: "min-h-[max(2.5rem,var(--sf-control-height-md))]!",
  lg: "min-h-[max(2.5rem,var(--sf-control-height-lg))]!",
} as const;

export function AddToCartButton({
  product,
  shownStoreId,
  quantity = 1,
  size = "md",
  compact = false,
  label,
  variant = "primary",
  onAdded,
  className = "",
  buttonClassName,
}: {
  product: CartProductRef;
  shownStoreId: string;
  quantity?: number;
  size?: "sm" | "md" | "lg";
  /** Smaller button with short labels, for narrow product cards. */
  compact?: boolean;
  label?: string;
  variant?: "primary" | "secondary";
  /** Called after a successful add (e.g. to open a cart drawer). */
  onAdded?: () => void;
  className?: string;
  /** A template's own button style, replacing the shared one (behaviour is unchanged). */
  buttonClassName?: string;
}) {
  const t = useStorefrontMessages();
  const inCart = useQuantityInCart(product.id);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 2000);
    return () => clearTimeout(timer);
  }, [message]);

  const sizing = compact ? `w-full ${COMPACT_MIN_HEIGHT[size]} px-2 text-xs sm:text-sm` : "w-full";

  if (product.stock <= 0) {
    return (
      <div className={className}>
        <button type="button" disabled className={buttonClassName ?? `${sfButtonClass("secondary", size)} ${sizing}`}>
          {t.outOfStock}
        </button>
      </div>
    );
  }

  const reachedLimit = inCart >= product.stock;
  const added = message === t.added;
  const text = reachedLimit ? (compact ? t.maxInCart : t.allStockInCart) : added ? t.added : (label ?? t.addToCart);

  return (
    <div className={className}>
      <button
        type="button"
        disabled={reachedLimit}
        className={buttonClassName ?? `${sfButtonClass(variant, size)} ${sizing}`}
        onClick={() => {
          const result = addToCart(product, quantity, shownStoreId);
          if (result.ok) {
            setMessage(t.added);
            onAdded?.();
          } else if (result.reason === "out-of-stock") setMessage(t.noMoreStock);
          else setMessage(t.otherStoreProduct);
        }}
      >
        {added ? (
          <Check className={`h-4 w-4 shrink-0 ${compact ? "max-[359px]:hidden" : ""}`} aria-hidden />
        ) : (
          <ShoppingBag className={`h-4 w-4 shrink-0 ${compact ? "max-[359px]:hidden" : ""}`} aria-hidden />
        )}
        <span className="truncate">{text}</span>
      </button>
      <p className="sr-only" aria-live="polite">
        {message === t.added ? t.addedToCart : (message ?? "")}
      </p>
      {message && !added && <p className="mt-1.5 text-xs text-destructive">{message}</p>}
    </div>
  );
}

/** Quantity picker plus add button for a product page; caps at what is still available. */
export function ProductPurchase({
  product,
  shownStoreId,
  label,
  onAdded,
  className = "",
  buttonClassName,
}: {
  product: CartProductRef;
  shownStoreId: string;
  label?: string;
  onAdded?: () => void;
  className?: string;
  buttonClassName?: string;
}) {
  const t = useStorefrontMessages();
  const inCart = useQuantityInCart(product.id);
  const [quantity, setQuantity] = useState(1);
  const available = Math.max(0, product.stock - inCart);
  const safeQuantity = Math.min(quantity, Math.max(1, available));
  return (
    <div className={className}>
      <div className="flex items-center gap-3">
        {product.stock > 0 && available > 0 && (
          <QuantitySelector value={safeQuantity} max={available} onChange={setQuantity} />
        )}
        <AddToCartButton
          product={product}
          shownStoreId={shownStoreId}
          quantity={safeQuantity}
          size="lg"
          label={label}
          onAdded={onAdded}
          buttonClassName={buttonClassName}
          className="min-w-0 flex-1"
        />
      </div>
      {inCart > 0 && (
        <p className="mt-3 text-sm text-muted-foreground" aria-live="polite">
          {t.alreadyInCart(inCart)}
        </p>
      )}
    </div>
  );
}
