import "server-only";
import { Prisma, type PrismaClient } from "@/lib/generated/prisma/client";
import { storeLetterLabel } from "@/lib/format";
import type { ActionResult } from "@/lib/admin/types";

export type Client = PrismaClient | Prisma.TransactionClient;

// Access control lives in lib/server/auth/guards.ts (sessions) and
// lib/server/admin/permissions.ts (which action needs which role).

// ---------------------------------------------------------------
// Results and database error mapping
// ---------------------------------------------------------------

export function ok<T>(data: T, message?: string): ActionResult<T> {
  return { ok: true, data, message };
}

export function fail(error: string, fieldErrors?: Record<string, string>): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

export const NOT_FOUND = {
  store: "This store does not exist or has been archived.",
  product: "This product was not found in this store.",
  category: "This category was not found in this store.",
  order: "This order was not found in this store.",
  inquiry: "This message was not found in this store.",
} as const;

export const INVALID = "Please fix the highlighted fields.";

/** Name of the unique index a Prisma P2002 error refers to, if any. */
export function uniqueViolation(error: unknown): string | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") return null;
  const meta = error.meta as
    | { target?: string[] | string; driverAdapterError?: { cause?: { constraint?: { index?: string; fields?: string[] } } } }
    | undefined;
  const constraint = meta?.driverAdapterError?.cause?.constraint;
  return constraint?.index ?? constraint?.fields?.join(",") ?? String(meta?.target ?? "unique");
}

/** P2025: an update/delete matched no row (e.g. wrong store for this product). */
export function isRecordNotFound(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}

/** Letter labels ("Client Store A", …) by creation order, archived stores included. */
export async function letterLabels(client: Client) {
  const all = await client.store.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true } });
  return new Map(all.map((s, index) => [s.id, storeLetterLabel(index)]));
}

/** URL-safe slug; falls back to `fallback` for names without Latin letters (e.g. Arabic). */
export function toSlug(value: string, fallback: string) {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return slug || fallback;
}

/** Makes `base` unique among `taken` by appending -2, -3, … */
export function uniqueSlug(base: string, taken: Set<string>) {
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
