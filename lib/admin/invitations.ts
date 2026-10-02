import { createHash, randomBytes } from "node:crypto";
import type { ManagedStoreTeamRole } from "./team";

export const STORE_INVITATION_TTL_MS = 72 * 60 * 60 * 1000;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export type StoreInvitationStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";

export interface StoreInvitationSummary {
  id: string;
  email: string;
  role: ManagedStoreTeamRole;
  status: StoreInvitationStatus;
  createdAt: string;
  expiresAt: string;
}

export function newStoreInvitationToken() {
  return randomBytes(32).toString("base64url");
}

export function isStoreInvitationToken(value: unknown): value is string {
  return typeof value === "string" && TOKEN_PATTERN.test(value);
}

export function hashStoreInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function storeInvitationStatus(
  invitation: { acceptedAt: Date | null; revokedAt: Date | null; expiresAt: Date },
  now = new Date(),
): StoreInvitationStatus {
  if (invitation.acceptedAt) return "ACCEPTED";
  if (invitation.revokedAt) return "REVOKED";
  return invitation.expiresAt <= now ? "EXPIRED" : "PENDING";
}
