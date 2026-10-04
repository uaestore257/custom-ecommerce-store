"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  ExternalLink,
  Globe,
  LayoutDashboard,
  LayoutTemplate,
  Mail,
  Menu,
  Package,
  Palette,
  Plus,
  Receipt,
  Settings,
  Store as StoreIcon,
  Tags,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { LinkButton } from "@/components/ui";
import type { AdminStoreSummary } from "@/lib/admin/types";
import { mayAccessStoreSection, type StoreMembershipRole, type StoreSection } from "@/lib/admin/store-access";
import { storeSettingsNav, storeTeamNav } from "@/lib/admin/store-navigation";
import { SignOutButton } from "./SignOutButton";
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
  { label: "Templates", href: "/admin/template", icon: LayoutTemplate },
  { label: "Agency settings", href: "/admin/settings", icon: Settings },
];

export function storeNav(storeId: string): NavItem[] {
  const base = `/admin/stores/${storeId}`;
  return [
    { label: "Overview", href: base, icon: LayoutDashboard, exact: true },
    { label: "Products", href: `${base}/products`, icon: Package },
    { label: "Categories", href: `${base}/categories`, icon: Tags },
    { label: "Orders", href: `${base}/orders`, icon: Receipt },
    { label: "Messages", href: `${base}/messages`, icon: Mail },
    { label: "Customers", href: `${base}/customers`, icon: Users },
    { label: "Domains", href: "/admin/domains", icon: Globe },
    { label: "Design", href: `${base}/design`, icon: Palette },
    { label: "Store settings", href: `${base}/settings`, icon: Settings },
  ];
}

export function storeNavForViewer(storeId: string, platform: boolean, role: StoreMembershipRole = "OWNER"): NavItem[] {
  const items = storeNav(storeId)
    .filter((item) => {
      const section: Partial<Record<NavItem["label"], StoreSection>> = {
        Overview: "overview",
        Products: "products",
        Categories: "categories",
        Orders: "orders",
        Messages: "messages",
        Customers: "customers",
        Domains: "domains",
        Design: "design",
        "Store settings": "settings",
      };
      const allowedSection = section[item.label];
      return item.label !== "Domains" || !platform
        ? platform || !allowedSection || mayAccessStoreSection(role, allowedSection)
        : false;
    })
    .map((item) =>
      !platform && role === "OWNER" && item.label === "Store settings"
        ? { ...item, ...storeSettingsNav(platform, storeId) }
        : item,
    );
  const team = storeTeamNav(platform, role);
  if (team) {
    const settingsIndex = items.findIndex((item) => item.label === "Store Settings");
    items.splice(settingsIndex < 0 ? items.length : settingsIndex, 0, { ...team, icon: Users });
  }
  return items;
}

export function isNavActive(pathname: string, item: { href: string; exact?: boolean }) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Minimal store info for the sidebar and store selector (from the database). */
export type ShellStore = Pick<AdminStoreSummary, "id" | "name" | "slug"> & {
  storefrontUrl: string | null;
  role?: StoreMembershipRole;
};

/** The signed-in admin user (name and email only). */
export interface ShellUser {
  name: string;
  email: string;
}

export function AdminShell({
  children,
  stores,
  user,
  platform,
  role,
  portal,
  selectedStoreId,
  agencyName,
}: {
  children: ReactNode;
  stores: ShellStore[];
  user: ShellUser;
  /** The platform owner (agency pages shown); false for a store owner, who sees only their store. */
  platform: boolean;
  role: StoreMembershipRole | null;
  portal: boolean;
  selectedStoreId: string | null;
  /** The agency name from Agency settings (the database). */
  agencyName: string;
}) {
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
        <SidebarContent stores={stores} platform={platform} role={role} portal={portal} selectedStoreId={selectedStoreId} agencyName={agencyName} />
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
            <SidebarContent stores={stores} platform={platform} role={role} portal={portal} selectedStoreId={selectedStoreId} agencyName={agencyName} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <AdminHeader stores={stores} user={user} platform={platform} portal={portal} selectedStoreId={selectedStoreId} onOpenMenu={() => setDrawerOpen(true)} />
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({
  stores,
  platform,
  role,
  portal,
  selectedStoreId,
  agencyName,
}: {
  stores: ShellStore[];
  platform: boolean;
  role: StoreMembershipRole | null;
  portal: boolean;
  selectedStoreId: string | null;
  agencyName: string;
}) {
  const pathname = usePathname();
  const params = useParams<{ storeId?: string }>();
  const selected = params.storeId
    ? (stores.find((s) => s.id === params.storeId) ?? null)
    : portal
      ? selectedStoreId
        ? (stores.find((s) => s.id === selectedStoreId) ?? null)
        : null
      : !platform
        ? (stores[0] ?? null)
        : null;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <Link href="/admin" className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-700 text-sm font-bold text-white">
          {(agencyName.trim().charAt(0) || "A").toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-bold leading-tight">
            {agencyName}
          </span>
          <span className="text-xs text-slate-500">{platform ? "Agency Admin" : "Store Admin"}</span>
        </span>
      </Link>

      {platform && (
        <nav aria-label="Agency" className="px-3 py-4">
          <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Agency</p>
          <NavList items={agencyNav} pathname={pathname} />
        </nav>
      )}

      {selected && (
        <nav aria-label={`Store: ${selected.name}`} className="border-t border-slate-200 px-3 py-4">
          <p className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Selected store</p>
          <p className="truncate px-2 pb-2 pt-1 text-sm font-semibold text-teal-800">{selected.name}</p>
          <NavList items={storeNavForViewer(selected.id, platform, role ?? selected.role ?? "OWNER")} pathname={pathname} />
        </nav>
      )}

      <div className="mt-auto space-y-3 border-t border-slate-200 p-4 text-xs text-slate-500">
        {selected?.storefrontUrl && (
          <Link
            href={selected.storefrontUrl}
            className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            View storefront
          </Link>
        )}
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
          <strong>Partly sample data.</strong> Customers are still saved in this browser only. Stores, products,
          categories, orders and agency settings are saved in the database.
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

function AdminHeader({
  stores,
  user,
  platform,
  portal,
  selectedStoreId,
  onOpenMenu,
}: {
  stores: ShellStore[];
  user: ShellUser;
  platform: boolean;
  portal: boolean;
  selectedStoreId: string | null;
  onOpenMenu: () => void;
}) {
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
        <StoreSelector stores={stores} platform={platform} portal={portal} selectedStoreId={selectedStoreId} />
        {platform && !onDashboard && (
          <LinkButton href="/admin/stores/new" size="sm" className="ml-auto shrink-0">
            <Plus className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Create New Store</span>
            <span className="sm:hidden">New</span>
          </LinkButton>
        )}
        <div className="ml-auto flex items-center gap-2">
          <LinkButton href="/admin/account" size="sm" variant="secondary">
            <Settings className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Account</span>
          </LinkButton>
          <SignOutButton email={user.email} />
        </div>
      </div>
    </header>
  );
}
