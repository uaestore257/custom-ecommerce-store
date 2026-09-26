"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  ExternalLink,
  LayoutDashboard,
  LayoutTemplate,
  Menu,
  Package,
  Plus,
  Receipt,
  Settings,
  Store as StoreIcon,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { LinkButton } from "@/components/ui";
import { findStore, useDemoState } from "@/lib/demo-db";
import { StoreSelector } from "./StoreSelector";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
}

const agencyNav: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Client stores", href: "/admin/stores", icon: StoreIcon, exact: true },
  { label: "Create store", href: "/admin/stores/new", icon: Plus, exact: true },
  { label: "Master template", href: "/admin/template", icon: LayoutTemplate },
  { label: "Agency settings", href: "/admin/settings", icon: Settings },
];

export function storeNav(storeId: string): NavItem[] {
  const base = `/admin/stores/${storeId}`;
  return [
    { label: "Overview", href: base, icon: LayoutDashboard, exact: true },
    { label: "Products", href: `${base}/products`, icon: Package },
    { label: "Orders", href: `${base}/orders`, icon: Receipt },
    { label: "Customers", href: `${base}/customers`, icon: Users },
    { label: "Store settings", href: `${base}/settings`, icon: Settings },
  ];
}

export function isNavActive(pathname: string, item: { href: string; exact?: boolean }) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function AdminShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  // Close the mobile drawer whenever the page changes.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setDrawerOpen(false);
  }

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin navigation">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Close navigation"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-white shadow-xl">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="absolute right-3 top-4 rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <AdminHeader onOpenMenu={() => setDrawerOpen(true)} />
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent() {
  const pathname = usePathname();
  const params = useParams<{ storeId?: string }>();
  const state = useDemoState();
  const selected = state && params.storeId ? findStore(state, params.storeId) : null;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <Link href="/admin" className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-700 text-sm font-bold text-white">
          {(state?.agency.agencyName.trim().charAt(0) || "A").toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-bold leading-tight">
            {state?.agency.agencyName ?? "Agency"}
          </span>
          <span className="text-xs text-slate-500">Agency Admin</span>
        </span>
      </Link>

      <nav aria-label="Agency" className="px-3 py-4">
        <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Agency</p>
        <NavList items={agencyNav} pathname={pathname} />
      </nav>

      {selected && (
        <nav aria-label={`Store: ${selected.name}`} className="border-t border-slate-200 px-3 py-4">
          <p className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Selected store</p>
          <p className="truncate px-2 pb-2 pt-1 text-sm font-semibold text-teal-800">{selected.name}</p>
          <NavList items={storeNav(selected.id)} pathname={pathname} />
        </nav>
      )}

      <div className="mt-auto space-y-3 border-t border-slate-200 p-4 text-xs text-slate-500">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          <ExternalLink className="h-4 w-4" aria-hidden />
          View storefront
        </Link>
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
          <strong>Demo mode.</strong> No login or permissions. Data is saved in this browser only.
        </p>
      </div>
    </div>
  );
}

function NavList({ items, pathname }: { items: NavItem[]; pathname: string }) {
  return (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const active = isNavActive(pathname, item);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                active ? "bg-teal-50 text-teal-800" : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <item.icon className={`h-4 w-4 ${active ? "text-teal-700" : "text-slate-400"}`} aria-hidden />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function AdminHeader({ onOpenMenu }: { onOpenMenu: () => void }) {
  // The dashboard has its own "Create New Store" button.
  const onDashboard = usePathname() === "/admin";
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onOpenMenu}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
        <StoreSelector />
        {!onDashboard && (
          <LinkButton href="/admin/stores/new" size="sm" className="ml-auto shrink-0">
            <Plus className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Create New Store</span>
            <span className="sm:hidden">New</span>
          </LinkButton>
        )}
      </div>
    </header>
  );
}
