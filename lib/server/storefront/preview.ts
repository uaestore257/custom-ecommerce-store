import type { Client } from "../admin/common";
import { isSlug } from "@/lib/validation";

/** Resolve only a public store by its route slug; request data never supplies a store ID. */
export async function resolveStorefrontPreviewId(client: Client, slug: unknown): Promise<string | null> {
  if (typeof slug !== "string" || !isSlug(slug)) return null;
  const store = await client.store.findFirst({
    where: { slug, status: "ACTIVE", archivedAt: null },
    select: { id: true },
  });
  return store?.id ?? null;
}
