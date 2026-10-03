"use server";

import { cookies } from "next/headers";
import type { ActionResult } from "@/lib/admin/types";
import { isStoreInvitationToken } from "@/lib/admin/invitations";
import { getAuth } from "@/lib/server/auth/auth";
import { acceptStoreInvitation, invitationForAcceptanceByToken } from "@/lib/server/admin/team";
import { getDb } from "@/lib/server/db";
import { hostContext } from "@/lib/server/auth/store-access";
import { requestRuntime } from "@/lib/server/request-runtime";

const INVITATION_COOKIE = "store_invitation";
const invalidInvitation: ActionResult<never> = {
  ok: false,
  error: "This invitation is invalid, expired, or already used.",
};

export async function prepareStoreInvitationAction(token: unknown): Promise<ActionResult<{
  email: string;
  role: "MANAGER" | "STAFF";
  storeName: string;
  nameRequired: boolean;
  passwordRequired: boolean;
}>> {
  if (!isStoreInvitationToken(token)) return invalidInvitation;
  const headers = await requestRuntime().headers();
  const { host, hostStore } = await hostContext(getDb(), headers.get("host") ?? "");
  if (host.kind !== "store" && host.kind !== "store-portal") return invalidInvitation;
  const invitation = await invitationForAcceptanceByToken(getDb(), token);
  if (host.kind === "store" && (!hostStore || hostStore.id !== invitation?.storeId)) return invalidInvitation;
  if (!invitation || (invitation.role !== "MANAGER" && invitation.role !== "STAFF")) return invalidInvitation;

  const user = await getDb().user.findUnique({
    where: { email: invitation.email },
    select: {
      isPlatformOwner: true,
      disabledAt: true,
      accounts: { where: { providerId: "credential" }, select: { id: true }, take: 1 },
      memberships: { where: { role: "OWNER" }, select: { id: true }, take: 1 },
    },
  });
  if (user?.isPlatformOwner || user?.disabledAt || user?.memberships.length) {
    return { ok: false, error: "This invitation cannot be accepted for this account." };
  }
  const cookieStore = await cookies();
  cookieStore.set(INVITATION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/accept-invitation",
    maxAge: 10 * 60,
  });
  return {
    ok: true,
    data: {
      email: invitation.email,
      role: invitation.role,
      storeName: invitation.store.name,
      nameRequired: !user,
      passwordRequired: !user || user.accounts.length === 0,
    },
  };
}

export async function acceptStoreInvitationAction(
  name: unknown,
  password: unknown,
): Promise<ActionResult<{ email: string }>> {
  const cookieStore = await cookies();
  const token = cookieStore.get(INVITATION_COOKIE)?.value;
  if (!isStoreInvitationToken(token)) return invalidInvitation;

  const headers = await requestRuntime().headers();
  const { host, hostStore } = await hostContext(getDb(), headers.get("host") ?? "");
  if (host.kind !== "store" && host.kind !== "store-portal") return invalidInvitation;
  const invitation = await invitationForAcceptanceByToken(getDb(), token);
  if (!invitation || (host.kind === "store" && (!hostStore || hostStore.id !== invitation.storeId))) {
    return invalidInvitation;
  }

  const result = await acceptStoreInvitation(getDb(), getAuth(), {
    storeId: invitation.storeId,
    token,
    name,
    password,
  });
  if (result.ok) cookieStore.delete(INVITATION_COOKIE);
  return result;
}
