"use client";

import { useEffect, useState } from "react";
import { AddToCartButton } from "@/components/storefront/CartControls";
import { useCartDrawer } from "@/components/storefront/CartDrawerContext";
import { formatStoreMoney } from "@/lib/storefront-cart";
import type { StorefrontProductSummary, StorefrontStore } from "@/lib/storefront-types";
import { KINETIC_CONTAINER, kineticButton } from "./styles";

/**
 * A buy bar pinned to the bottom of the viewport once the product page's
 * own purchase panel (`targetId`) has scrolled up out of view. It adds one
 * through the shared add-to-cart and opens the cart sheet. While hidden it
 * is inert, so it is never in the tab order.
 */
export function KineticStickyBuyBar({
  product,
  store,
  targetId,
}: {
  product: StorefrontProductSummary;
  store: StorefrontStore;
  targetId: string;
}) {
  const { show } = useCartDrawer();
  const [visible, setVisible] = useState(false);

  // Position-based rather than an IntersectionObserver: a jump (End key,
  // anchor link, resize) can carry the panel from below the fold straight
  // to above it without ever intersecting, which an observer never reports.
  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      // Only once the panel is ABOVE the viewport, not before reaching it.
      setVisible(target.getBoundingClientRect().bottom < 0);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [targetId]);

  return (
    <div
      role="region"
      aria-label="Quick buy"
      aria-hidden={!visible}
      inert={!visible}
      data-visible={visible}
      className={`fixed inset-x-0 bottom-0 z-30 border-t-2 border-foreground bg-background transition-transform duration-200 ease-out motion-reduce:transition-none ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className={`${KINETIC_CONTAINER} flex items-center gap-4 py-3`}>
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-sm font-bold sm:text-base">{product.name}</p>
          <p className="text-sm tabular-nums text-muted-foreground">{formatStoreMoney(store, product.priceMinor)}</p>
        </div>
        <AddToCartButton
          product={product}
          shownStoreId={store.id}
          onAdded={show}
          buttonClassName={`${kineticButton} min-h-11 px-5`}
          className="w-40 shrink-0 sm:w-56"
        />
      </div>
    </div>
  );
}
