import "server-only";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import { passwordProblem } from "@/lib/auth/password-policy";
import type { ActionResult } from "@/lib/admin/types";
import {
  hashStoreInvitationToken,
  isStoreInvitationToken,
  newStoreInvitationToken,
  STORE_INVITATION_TTL_MS,
  storeInvitationStatus,
  type StoreInvitationSummary,
} from "@/lib/admin/invitations";
import { isEmail } from "@/lib/validation";
import { isManagedStoreTeamRole, type ManagedStoreTeamRole, type StoreTeamMember } from "@/lib/admin/team";
import { saveCredentialPassword } from "@/lib/server/auth/credentials";
import type { Auth } from "@/lib/server/auth/auth";
import type { Mailer } from "@/lib/server/mailer";
import { recordAudit } from "@/lib/server/audit";

type Db = Pick<PrismaClient, "$transaction" | "storeInvitation" | "storeMembership" | "user">;

export async function listStoreTeamMembers(db: Db, storeId: string): Promise<StoreTeamMember[]> {
  const memberships = await db.storeMembership.findMany({
    where: { storeId },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      userId: true,
      role: true,
      createdAt: true,
      user: { select: { name: true, email: true, disabledAt: true, isPlatformOwner: true } },
    },
  });
  return memberships.map(({ user, ...membership }) => ({
    id: membership.id,
    role: membership.role,
    createdAt: membership.createdAt.toISOString(),
    name: user.name,
    email: user.email,
    disabled: user.disabledAt !== null,
    isPlatformOwner: user.isPlatformOwner,
  }));
}

export async function listStoreInvitations(db: Db, storeId: string): Promise<StoreInvitationSummary[]> {
  const invitations = await db.storeInvitation.findMany({
    where: { storeId },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, role: true, createdAt: true, expiresAt: true, acceptedAt: true, revokedAt: true },
  });
  return invitations.map(({ acceptedAt, revokedAt, ...invitation }) => ({
    id: invitation.id,
    email: invitation.email,
    role: invitation.role as ManagedStoreTeamRole,
    createdAt: invitation.createdAt.toISOString(),
    expiresAt: invitation.expiresAt.toISOString(),
    status: storeInvitationStatus({ acceptedAt, revokedAt, expiresAt: invitation.expiresAt }),
  }));
}

export async function createStoreInvitation(
  db: Db,
  input: { storeId: string; actorUserId: string; email: unknown; role: unknown; storeName: string; acceptUrl: string },
  mailer: Mailer | null,
  now = new Date(),
): Promise<ActionResult> {
  if (!mailer) return { ok: false, error: "Invitation email is not configured. No invitation was created." };
  const role = input.role;
  if (!isManagedStoreTeamRole(role)) return { ok: false, error: "Choose Manager or Staff." };
  if (typeof input.email !== "string") return { ok: false, error: "Enter a valid email address." };
  const email = input.email.trim().toLowerCase();
  if (email.length > 254 || !isEmail(email)) return { ok: false, error: "Enter a valid email address." };

  const existingInvitation = await db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { email },
      select: {
        id: true,
        isPlatformOwner: true,
        disabledAt: true,
        memberships: { where: { role: "OWNER" }, select: { id: true }, take: 1 },
      },
    });
    if (user?.isPlatformOwner) return { ok: false as const, error: "Platform Owner accounts cannot be invited to a store." };
    if (user?.disabledAt) return { ok: false as const, error: "This account is disabled. Ask the Platform Owner for assistance." };
    if (user?.memberships.length) return { ok: false as const, error: "Store Owner accounts cannot be invited as Manager or Staff." };
    if (user && await tx.storeMembership.findUnique({
      where: { userId_storeId: { userId: user.id, storeId: input.storeId } },
      select: { id: true },
    })) {
      return { ok: false as const, error: "This account is already a member of the store." };
    }

    await tx.storeInvitation.updateMany({
      where: { storeId: input.storeId, email, acceptedAt: null, revokedAt: null },
      data: { revokedAt: now },
    });

    const token = newStoreInvitationToken();
    const invitation = await tx.storeInvitation.create({
      data: {
        storeId: input.storeId,
        invitedByUserId: input.actorUserId,
        email,
        role,
        tokenHash: hashStoreInvitationToken(token),
        expiresAt: new Date(now.getTime() + STORE_INVITATION_TTL_MS),
      },
      select: { id: true, role: true, expiresAt: true },
    });
    await recordAudit(tx, {
      action: "store.invitation_create",
      actorUserId: input.actorUserId,
      storeId: input.storeId,
      targetType: "invitation",
      targetId: invitation.id,
      metadata: { role: invitation.role },
    });
    return { ok: true as const, invitation, token };
  });

  if (!existingInvitation.ok) return { ok: false, error: existingInvitation.error };

  try {
    const url = new URL(input.acceptUrl);
    url.search = "";
    url.hash = `token=${encodeURIComponent(existingInvitation.token)}`;
    await mailer.send({
      to: email,
      subject: `Join ${input.storeName} as a ${role === "MANAGER" ? "Manager" : "Staff"}`,
      text: [
        `You have been invited to join ${input.storeName} as a ${role === "MANAGER" ? "Manager" : "Staff"}.`,
        "",
        "Accept this invitation within 72 hours:",
        url.toString(),
        "",
        "If you were not expecting this invitation, you can ignore this message.",
      ].join("\n"),
    });
  } catch {
    await db.$transaction(async (tx) => {
      await tx.storeInvitation.updateMany({
        where: { id: existingInvitation.invitation.id, acceptedAt: null, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await recordAudit(tx, {
        action: "store.invitation_delivery_failed",
        actorUserId: input.actorUserId,
        storeId: input.storeId,
        targetType: "invitation",
        targetId: existingInvitation.invitation.id,
        metadata: { role: existingInvitation.invitation.role },
      });
    });
    return { ok: false, error: "The invitation email could not be sent. No active invitation was left." };
  }

  return { ok: true, data: undefined, message: "Invitation sent." };
}

export async function revokeStoreInvitation(
  db: Db,
  input: { storeId: string; actorUserId: string; invitationId: string },
  now = new Date(),
): Promise<ActionResult> {
  return db.$transaction(async (tx) => {
    const changed = await tx.storeInvitation.updateMany({
      where: {
        id: input.invitationId,
        storeId: input.storeId,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: { revokedAt: now },
    });
    if (changed.count !== 1) return { ok: false, error: "Only a pending invitation for this store can be revoked." };
    await recordAudit(tx, {
      action: "store.invitation_revoke",
      actorUserId: input.actorUserId,
      storeId: input.storeId,
      targetType: "invitation",
      targetId: input.invitationId,
    });
    return { ok: true, data: undefined, message: "Invitation revoked." };
  });
}

export async function invitationForAcceptance(
  db: Db,
  storeId: string,
  token: unknown,
  now = new Date(),
) {
  if (!isStoreInvitationToken(token)) return null;
  return db.storeInvitation.findFirst({
    where: {
      storeId,
      tokenHash: hashStoreInvitationToken(token),
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: now },
    },
    select: {
      id: true,
      storeId: true,
      email: true,
      role: true,
      expiresAt: true,
      store: { select: { name: true } },
    },
  });
}

export async function invitationForAcceptanceByToken(
  db: Db,
  token: unknown,
  now = new Date(),
) {
  if (!isStoreInvitationToken(token)) return null;
  return db.storeInvitation.findFirst({
    where: {
      tokenHash: hashStoreInvitationToken(token),
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: now },
    },
    select: {
      id: true,
      storeId: true,
      email: true,
      role: true,
      expiresAt: true,
      store: { select: { name: true } },
    },
  });
}

export async function acceptStoreInvitation(
  db: Db,
  auth: Auth,
  input: { storeId: string; token: unknown; name: unknown; password: unknown },
  now = new Date(),
): Promise<ActionResult<{ email: string }>> {
  const token = input.token;
  if (!isStoreInvitationToken(token)) {
    return { ok: false, error: "This invitation is invalid, expired, or already used." };
  }
  const invitation = await invitationForAcceptance(db, input.storeId, token, now);
  if (!invitation || !isManagedStoreTeamRole(invitation.role)) {
    return { ok: false, error: "This invitation is invalid, expired, or already used." };
  }

  const existingUser = await db.user.findUnique({
    where: { email: invitation.email },
    select: {
      id: true,
      isPlatformOwner: true,
      disabledAt: true,
      emailVerified: true,
      accounts: { where: { providerId: "credential" }, select: { id: true }, take: 1 },
      memberships: { where: { role: "OWNER" }, select: { id: true }, take: 1 },
    },
  });
  if (existingUser?.isPlatformOwner || existingUser?.disabledAt || existingUser?.memberships.length) {
    return { ok: false, error: "This invitation cannot be accepted for this account." };
  }

  let name: string | undefined;
  let passwordHash: string | undefined;
  const accountSetupRequired = !existingUser || existingUser.accounts.length === 0;
  if (accountSetupRequired) {
    if (!existingUser) {
      if (typeof input.name !== "string") return { ok: false, error: "Enter your name and choose a password." };
      name = input.name.trim();
      if (!name || name.length > 120) return { ok: false, error: "Enter a valid name." };
    }
    if (typeof input.password !== "string") return { ok: false, error: "Choose a password." };
    const problem = passwordProblem(input.password, invitation.email);
    if (problem) {
      return { ok: false, error: problem };
    }
    passwordHash = await (await auth.$context).password.hash(input.password);
  }

  try {
    await db.$transaction(async (tx) => {
      const claimed = await tx.storeInvitation.updateMany({
        where: {
          id: invitation.id,
          storeId: input.storeId,
          tokenHash: hashStoreInvitationToken(token),
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { acceptedAt: now },
      });
      if (claimed.count !== 1) throw new Error("invitation-unavailable");

      let user = await tx.user.findUnique({
        where: { email: invitation.email },
        select: {
          id: true,
          isPlatformOwner: true,
          disabledAt: true,
          emailVerified: true,
          accounts: { where: { providerId: "credential" }, select: { id: true }, take: 1 },
          memberships: { where: { role: "OWNER" }, select: { id: true }, take: 1 },
        },
      });
      if (user?.isPlatformOwner || user?.disabledAt || user?.memberships.length) throw new Error("account-unavailable");
      if (user && await tx.storeMembership.findUnique({
        where: { userId_storeId: { userId: user.id, storeId: input.storeId } },
        select: { id: true },
      })) throw new Error("membership-exists");

      if (!user) {
        if (!name || !passwordHash) throw new Error("account-setup-required");
        user = await tx.user.create({
          data: { email: invitation.email, name, emailVerified: true, isPlatformOwner: false },
          select: {
            id: true,
            isPlatformOwner: true,
            disabledAt: true,
            emailVerified: true,
            accounts: { where: { providerId: "credential" }, select: { id: true }, take: 1 },
            memberships: { where: { role: "OWNER" }, select: { id: true }, take: 1 },
          },
        });
        await saveCredentialPassword(tx, user.id, passwordHash);
      } else if (user.accounts.length === 0) {
        if (!passwordHash) throw new Error("account-setup-required");
        await saveCredentialPassword(tx, user.id, passwordHash);
      }
      if (user && !user.emailVerified) {
        await tx.user.update({ where: { id: user.id }, data: { emailVerified: true } });
      }

      await tx.storeMembership.create({
        data: { userId: user.id, storeId: input.storeId, role: invitation.role },
      });
      await recordAudit(tx, {
        action: "store.invitation_accept",
        actorUserId: user.id,
        storeId: input.storeId,
        targetType: "invitation",
        targetId: invitation.id,
        metadata: { role: invitation.role },
      });
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "";
    if (reason === "invitation-unavailable" || reason === "membership-exists") {
      return { ok: false, error: "This invitation is invalid, expired, or already used." };
    }
    if (reason === "account-unavailable") return { ok: false, error: "This invitation cannot be accepted for this account." };
    if (reason === "account-setup-required") return { ok: false, error: "Enter your name and choose a password." };
    throw error;
  }
  return { ok: true, data: { email: invitation.email }, message: "Invitation accepted. Sign in to continue." };
}

export async function updateStoreTeamMemberRole(
  db: Db,
  storeId: string,
  actorUserId: string,
  memberId: string,
  role: ManagedStoreTeamRole,
): Promise<ActionResult> {
  if (!isManagedStoreTeamRole(role)) return { ok: false, error: "Choose Manager or Staff." };

  return db.$transaction(async (tx) => {
    const membership = await tx.storeMembership.findFirst({
      where: { id: memberId, storeId },
      select: { userId: true, role: true, user: { select: { isPlatformOwner: true } } },
    });
    if (!membership || !isManagedStoreTeamRole(membership.role) || membership.user.isPlatformOwner) {
      return { ok: false, error: "Only Manager or Staff members of this store can be changed." };
    }
    if (membership.userId === actorUserId) {
      return { ok: false, error: "You cannot change your own team role." };
    }
    if (membership.role === role) return { ok: true, data: undefined, message: "Role is already set." };

    const changed = await tx.storeMembership.updateMany({
      where: { id: memberId, storeId, role: membership.role },
      data: { role },
    });
    if (changed.count !== 1) return { ok: false, error: "This team member changed. Refresh and try again." };
    await recordAudit(tx, {
      action: "store.member_role_change",
      actorUserId,
      storeId,
      targetType: "membership",
      targetId: memberId,
      metadata: { from: membership.role, to: role },
    });
    return { ok: true, data: undefined, message: "Team role updated." };
  });
}

export async function revokeStoreTeamMember(
  db: Db,
  storeId: string,
  actorUserId: string,
  memberId: string,
): Promise<ActionResult> {
  return db.$transaction(async (tx) => {
    const membership = await tx.storeMembership.findFirst({
      where: { id: memberId, storeId },
      select: { userId: true, role: true, user: { select: { isPlatformOwner: true } } },
    });
    if (!membership || !isManagedStoreTeamRole(membership.role) || membership.user.isPlatformOwner) {
      return { ok: false, error: "Only Manager or Staff members of this store can be removed." };
    }
    if (membership.userId === actorUserId) {
      return { ok: false, error: "You cannot remove your own team access." };
    }
    const removed = await tx.storeMembership.deleteMany({
      where: { id: memberId, storeId, role: membership.role },
    });
    if (removed.count !== 1) return { ok: false, error: "This team member changed. Refresh and try again." };
    await recordAudit(tx, {
      action: "store.member_revoke",
      actorUserId,
      storeId,
      targetType: "membership",
      targetId: memberId,
      metadata: { role: membership.role },
    });
    return { ok: true, data: undefined, message: "Team access revoked." };
  });
}
