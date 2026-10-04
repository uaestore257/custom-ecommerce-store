import "server-only";
import { cache } from "react";
import type { Prisma, PrismaClient } from "@/lib/generated/prisma/client";
import type { ActionResult } from "@/lib/admin/types";
import {
  normalizeSocialLinks,
  normalizeTeam,
  toAgencyProfile,
  validateAgencySettingsInput,
  type AgencyProfile,
  type AgencySettingsInput,
} from "@/lib/agency/profile";
import type { PlatformOwner } from "./auth/guards";
import { recordAudit } from "./audit";
import { getDb } from "./db";
import type { Client } from "./admin/common";

// ---------------------------------------------------------------
// AGENCY SETTINGS (server). The one place the agency profile is read and
// written. Reads select ONLY the agency columns of the platform's single
// PlatformSettings row — no Store, owner or tenant data is ever joined —
// and the public site receives the AgencyProfile DTO built from them
// (lib/agency/profile.ts). Writes are platform-owner only (the action in
// app/admin/actions.ts checks; this layer validates and audits).
// ---------------------------------------------------------------

const AGENCY_SELECT = {
  platformName: true,
  contactEmail: true,
  tagline: true,
  description: true,
  logoUrl: true,
  logoIsWordmark: true,
  brandMarkUrl: true,
  aboutTitle: true,
  aboutBody: true,
  team: true,
  phone: true,
  whatsapp: true,
  addressLine: true,
  city: true,
  region: true,
  country: true,
  postalCode: true,
  businessHours: true,
  enquiryEmail: true,
  socialLinks: true,
  seoTitle: true,
  seoDescription: true,
  ogImageUrl: true,
} as const;

/** The public agency profile, once per request. */
export const getAgencyProfile = cache(async (): Promise<AgencyProfile> => {
  const row = await getDb().platformSettings.findUnique({ where: { id: 1 }, select: AGENCY_SELECT });
  return toAgencyProfile(row);
});

/** Agency settings for the admin form (platform owner pages only). */
export async function getAgencySettingsForAdmin(client: Client): Promise<AgencySettingsInput | null> {
  const row = await client.platformSettings.findUnique({ where: { id: 1 }, select: AGENCY_SELECT });
  if (!row) return null;
  return { ...row, team: normalizeTeam(row.team), socialLinks: normalizeSocialLinks(row.socialLinks) };
}

/** Platform owner only: replace the agency settings with a validated form. */
export async function updateAgencySettings(
  actor: PlatformOwner,
  client: PrismaClient,
  input: unknown,
): Promise<ActionResult<AgencySettingsInput>> {
  const result = validateAgencySettingsInput(input);
  if (!result.ok) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: result.errors };
  // Plain JSON copies of the validated lists (InputJsonValue for Prisma).
  const data = {
    ...result.value,
    team: result.value.team.map((member) => ({ ...member })) as Prisma.InputJsonArray,
    socialLinks: result.value.socialLinks.map((link) => ({ ...link })) as Prisma.InputJsonArray,
  };
  return client.$transaction(async (tx) => {
    const before = await tx.platformSettings.findUnique({ where: { id: 1 }, select: AGENCY_SELECT });
    await tx.platformSettings.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });
    // Which fields changed — never their values.
    const changed = Object.keys(AGENCY_SELECT).filter(
      (key) => JSON.stringify(before?.[key as keyof typeof AGENCY_SELECT] ?? null) !== JSON.stringify(data[key as keyof typeof data] ?? null),
    );
    await recordAudit(tx, {
      action: "platform.agency_settings_update",
      actorUserId: actor.userId,
      targetType: "platform_settings",
      targetId: "1",
      metadata: { changed },
    });
    return { ok: true, data: result.value, message: "Agency settings saved. The public website now uses them." };
  });
}
