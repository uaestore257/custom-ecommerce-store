import "server-only";
import type { Prisma, PrismaClient } from "@/lib/generated/prisma/client";

// ---------------------------------------------------------------
// AUDIT LOG. Records who did what, to which store, and when. Rows are
// append-only (a database trigger rejects edits and deletes).
// Never pass passwords, session tokens, invitation tokens or other
// secrets in `metadata`: only IDs, field names and status values.
// ---------------------------------------------------------------

export type AuditAction =
  | "auth.sign_in"
  | "auth.sign_in_failed"
  | "auth.sign_out"
  | "platform_owner.create"
  | "platform_owner.password_reset"
  | "platform.agency_settings_update"
  | "account.profile_change"
  | "store.create"
  | "store.update_settings"
  | "store.status_change"
  | "store.archive"
  | "store.restore"
  | "store.owner_change"
  | "store.member_role_change"
  | "store.member_revoke"
  | "store.invitation_create"
  | "store.invitation_delivery_failed"
  | "store.invitation_revoke"
  | "store.invitation_accept"
  | "store.domain_add"
  | "store.domain_verify"
  | "store.domain_primary"
  | "store.domain_disable"
  | "store.design_update"
  | "store.demo_flag"
  | "store.demo_provision"
  | "order.status_change"
  | "order.cancel"
  | "order.payment_change"
  | "inquiry.status_change";

type SafeValue = string | number | boolean | null | string[];

export interface AuditInput {
  action: AuditAction;
  actorUserId?: string | null;
  storeId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, SafeValue>;
  ipAddress?: string | null;
}

type Client = PrismaClient | Prisma.TransactionClient;

export async function recordAudit(client: Client, event: AuditInput) {
  await client.auditEvent.create({
    data: {
      action: event.action,
      actorUserId: event.actorUserId ?? null,
      storeId: event.storeId ?? null,
      targetType: event.targetType ?? null,
      targetId: event.targetId ?? null,
      metadata: event.metadata ?? undefined,
      ipAddress: event.ipAddress?.slice(0, 64) ?? null,
    },
  });
}
