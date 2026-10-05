import "server-only";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import type { ActionResult } from "@/lib/admin/types";
import { getTemplateDefinition, isTemplateKey, resolveTemplateKey, TEMPLATE_KEYS, type TemplateKey } from "@/lib/templates/registry";
import { normalizeThemeConfig, validateThemeConfigInput } from "@/lib/templates/theme";
import type { ThemeSelection } from "@/lib/templates/types";
import type { PlatformOwner } from "../auth/guards";
import { recordAudit } from "../audit";
import type { Client } from "./common";

// ---------------------------------------------------------------
// STORE DESIGN (template selection). Switching template changes ONLY the
// store's templateKey and themeConfig — presentation — never products,
// categories, orders, customers, domains or settings. Values are
// validated against the compile-time registry; nothing renderable is
// stored. Callers check permissions first (app/admin/actions.ts).
// ---------------------------------------------------------------

export interface AdminStoreDesign {
  templateKey: TemplateKey;
  theme: ThemeSelection;
  isDemo: boolean;
  workServiceSlug: string | null;
}

/** Demo stores per template, for "View live demo" links (public, ACTIVE only). */
export type TemplateDemoStores = Partial<Record<TemplateKey, { id: string; name: string; slug: string }[]>>;

export async function getAdminStoreDesign(client: Client, storeId: string): Promise<AdminStoreDesign | null> {
  const store = await client.store.findFirst({
    where: { id: storeId, archivedAt: null },
    select: { templateKey: true, themeConfig: true, isDemo: true, workServiceSlug: true },
  });
  if (!store) return null;
  const templateKey = resolveTemplateKey(store.templateKey);
  return {
    templateKey,
    theme: normalizeThemeConfig(getTemplateDefinition(templateKey), store.themeConfig),
    isDemo: store.isDemo,
    workServiceSlug: store.workServiceSlug,
  };
}

export async function listTemplateDemoStores(client: Client): Promise<TemplateDemoStores> {
  const stores = await client.store.findMany({
    where: { isDemo: true, status: "ACTIVE", archivedAt: null },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, name: true, slug: true, templateKey: true },
  });
  const result: TemplateDemoStores = {};
  for (const { templateKey, ...store } of stores) {
    if (!isTemplateKey(templateKey)) continue;
    (result[templateKey] ??= []).push(store);
  }
  return result;
}

/** How many non-archived stores use each registered template (platform template library). */
export async function countStoresByTemplate(client: Client): Promise<Record<TemplateKey, number>> {
  const rows = await client.store.groupBy({ by: ["templateKey"], where: { archivedAt: null }, _count: { _all: true } });
  const counts = Object.fromEntries(TEMPLATE_KEYS.map((key) => [key, 0])) as Record<TemplateKey, number>;
  for (const row of rows) counts[resolveTemplateKey(row.templateKey)] += row._count._all;
  return counts;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Choose a registered template and its options for one store. */
export async function updateStoreDesign(
  client: PrismaClient,
  storeId: string,
  actorUserId: string,
  input: unknown,
): Promise<ActionResult<AdminStoreDesign>> {
  if (!isPlainObject(input)) return { ok: false, error: "Invalid request." };
  if (!isTemplateKey(input.templateKey)) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: { templateKey: "Choose an available template." } };
  }
  const templateKey = input.templateKey;
  const theme = validateThemeConfigInput(getTemplateDefinition(templateKey), input.theme);
  if (!theme.ok) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: theme.errors };

  return client.$transaction(async (tx) => {
    const before = await tx.store.findFirst({
      where: { id: storeId, archivedAt: null },
      select: { templateKey: true, isDemo: true, workServiceSlug: true },
    });
    if (!before) return { ok: false, error: "This store does not exist or has been archived." };
    await tx.store.update({ where: { id: storeId }, data: { templateKey, themeConfig: { ...theme.value } } });
    await recordAudit(tx, {
      action: "store.design_update",
      actorUserId,
      storeId,
      targetType: "store",
      targetId: storeId,
      metadata: {
        templateKey,
        previousTemplateKey: before.templateKey,
        theme: Object.entries(theme.value).map(([option, choice]) => `${option}=${choice}`),
      },
    });
    return {
      ok: true,
      data: { templateKey, theme: theme.value, isDemo: before.isDemo, workServiceSlug: before.workServiceSlug },
      message: "Design saved.",
    };
  });
}

/** Platform owner only: mark a store as a template demonstration store (never indexed). */
export async function setStoreDemo(
  actor: PlatformOwner,
  client: PrismaClient,
  storeId: string,
  isDemo: unknown,
): Promise<ActionResult<{ isDemo: boolean }>> {
  if (typeof isDemo !== "boolean") return { ok: false, error: "Invalid request." };
  return client.$transaction(async (tx) => {
    const updated = await tx.store.updateMany({ where: { id: storeId, archivedAt: null }, data: { isDemo } });
    if (updated.count !== 1) return { ok: false, error: "This store does not exist or has been archived." };
    await recordAudit(tx, {
      action: "store.demo_flag",
      actorUserId: actor.userId,
      storeId,
      targetType: "store",
      targetId: storeId,
      metadata: { isDemo },
    });
    return { ok: true, data: { isDemo }, message: isDemo ? "Marked as a demo store." : "No longer a demo store." };
  });
}
