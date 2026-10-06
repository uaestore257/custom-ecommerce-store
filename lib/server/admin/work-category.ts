import "server-only";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import type { ActionResult } from "@/lib/admin/types";
import { SERVICE_CATEGORIES } from "@/lib/platform/services";
import type { PlatformOwner } from "../auth/guards";
import { recordAudit } from "../audit";

/** Set or clear the explicit Services category used to group this store in Work. */
export async function setStoreWorkServiceCategory(
  actor: PlatformOwner,
  client: PrismaClient,
  storeId: string,
  value: unknown,
): Promise<ActionResult<{ workServiceSlug: string | null }>> {
  const workServiceSlug = value === null ? null : value;
  if (
    workServiceSlug !== null &&
    (typeof workServiceSlug !== "string" || !SERVICE_CATEGORIES.some((category) => category.slug === workServiceSlug))
  ) {
    return {
      ok: false,
      error: "Please choose a category from Services.",
      fieldErrors: { workServiceSlug: "Choose a valid Services category." },
    };
  }

  return client.$transaction(async (tx) => {
    const updated = await tx.store.updateMany({
      where: { id: storeId, archivedAt: null },
      data: { workServiceSlug },
    });
    if (updated.count !== 1) return { ok: false, error: "This store does not exist or has been archived." };
    await recordAudit(tx, {
      action: "store.work_service_category",
      actorUserId: actor.userId,
      storeId,
      targetType: "store",
      targetId: storeId,
      metadata: { workServiceSlug },
    });
    return { ok: true, data: { workServiceSlug }, message: "Work category saved." };
  });
}

/** Set or clear this store's explicit display order within its Work category. */
export async function setStoreWorkOrder(
  actor: PlatformOwner,
  client: PrismaClient,
  storeId: string,
  value: unknown,
): Promise<ActionResult<{ workOrder: number | null }>> {
  const workOrder = value === null ? null : value;
  if (workOrder !== null && (typeof workOrder !== "number" || !Number.isInteger(workOrder) || workOrder < 1 || workOrder > 9999)) {
    return {
      ok: false,
      error: "Choose a whole number from 1 to 9999.",
      fieldErrors: { workOrder: "Enter a whole number from 1 to 9999." },
    };
  }

  return client.$transaction(async (tx) => {
    const updated = await tx.store.updateMany({
      where: { id: storeId, archivedAt: null },
      data: { workOrder },
    });
    if (updated.count !== 1) return { ok: false, error: "This store does not exist or has been archived." };
    await recordAudit(tx, {
      action: "store.work_order",
      actorUserId: actor.userId,
      storeId,
      targetType: "store",
      targetId: storeId,
      metadata: { workOrder },
    });
    return { ok: true, data: { workOrder }, message: "Work display order saved." };
  });
}
