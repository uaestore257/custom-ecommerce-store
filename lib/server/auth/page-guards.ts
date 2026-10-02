import "server-only";
import { notFound, redirect } from "next/navigation";
import {
  AccessDenied,
  requireAdminViewer,
  requirePlatformOwner,
  requireStoreAccess,
  requireStoreSection,
  type AdminViewer,
  type PlatformOwner,
  type StoreAccessGrant,
  type StoreSection,
} from "./guards";

// For pages and layouts: signed out -> /login; anyone without access ->
// the same 404 as a page that doesn't exist (nothing leaks about which
// stores exist or who owns them).
async function orRedirect<T>(check: () => Promise<T>): Promise<T> {
  try {
    return await check();
  } catch (error) {
    if (error instanceof AccessDenied) {
      if (error.reason === "unauthenticated") redirect("/login");
      notFound();
    }
    throw error;
  }
}

/** Platform-only pages (store list, create store, agency settings, template), on ADMIN_HOST. */
export function requirePlatformOwnerPage(): Promise<PlatformOwner> {
  return orRedirect(requirePlatformOwner);
}

/** Pages inside one store: the platform owner on ADMIN_HOST, or that store's OWNER on its own host. */
export function requireStoreAccessPage(storeId: string, section?: StoreSection): Promise<StoreAccessGrant> {
  return orRedirect(() => section ? requireStoreSection(storeId, section) : requireStoreAccess(storeId, "read"));
}

/** The admin layout: whoever may use the admin on this host. */
export function requireAdminViewerPage(): Promise<AdminViewer> {
  return orRedirect(requireAdminViewer);
}
