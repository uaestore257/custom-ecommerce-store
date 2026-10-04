import "server-only";
import { notFound } from "next/navigation";
import type { StorefrontContext } from "@/lib/storefront-types";
import { getStorefrontTemplate } from "@/templates";
import type { StorefrontTemplate } from "@/templates/types";
import { getRequestStorefront } from "./catalog";

/**
 * For storefront pages: this request's public store and the template its
 * own row selects (a 404 when the host serves no public store).
 */
export async function requireStorefrontPage(): Promise<{ context: StorefrontContext; template: StorefrontTemplate }> {
  const context = await getRequestStorefront();
  if (!context) notFound();
  return { context, template: getStorefrontTemplate(context.store.templateKey) };
}
