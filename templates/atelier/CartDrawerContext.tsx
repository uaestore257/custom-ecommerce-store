"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

// Open/close state for Atelier's cart drawer, so the header and any
// "Add to bag" button (e.g. on the product page) share one drawer.

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
