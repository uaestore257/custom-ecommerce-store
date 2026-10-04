"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

// Open/close state for a template's cart drawer or sheet, so its header and
// any add-to-cart button (e.g. on the product page) share one surface.
// Templates render the surface itself with StorefrontOverlay (./Overlay).

interface DrawerState {
  open: boolean;
  show: () => void;
  hide: () => void;
}

const DrawerContext = createContext<DrawerState | null>(null);

export function CartDrawerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const show = useCallback(() => setOpen(true), []);
  const hide = useCallback(() => setOpen(false), []);
  const value = useMemo(() => ({ open, show, hide }), [open, show, hide]);
  return <DrawerContext.Provider value={value}>{children}</DrawerContext.Provider>;
}

export function useCartDrawer(): DrawerState {
  const value = useContext(DrawerContext);
  if (!value) throw new Error("useCartDrawer must be used inside CartDrawerProvider");
  return value;
}
