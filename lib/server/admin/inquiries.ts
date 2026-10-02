import "server-only";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import { isInquiryStatus, nextInquiryStatuses } from "@/lib/admin/inquiry-rules";
import type { AdminInquiry } from "@/lib/admin/types";
import { recordAudit } from "../audit";
import type { StoreActor } from "../auth/guards";
import { fail, NOT_FOUND, ok, type Client } from "./common";

// ---------------------------------------------------------------
// CONTACT MESSAGES (admin inbox) — always inside ONE store.
// The storeId comes from the route; a message of another store is "not
// found". Callers must already have passed requireStorePage(storeId) (reads) or
// requireStoreAccess(storeId, "write") (changes, which take its actor).
//
// A status change names the status the admin saw ("from") and only
// applies while the message still has it (a conditional update), so a
// stale page or two admins at once can't apply it twice. The change and
// its audit event are written in one transaction; the audit event holds
// only the status values, never the message or the sender's details.
// ---------------------------------------------------------------

const MAX_ROWS = 200;
const CHANGED = "This message was changed in the meantime. Reload the page to see its current status.";

function findStore(client: Client, storeId: string) {
  return client.store.findFirst({ where: { id: storeId, archivedAt: null }, select: { id: true } });
}

/** The store's messages, newest first, or null if the store is missing/archived. */
export async function listAdminInquiries(client: Client, storeId: string): Promise<AdminInquiry[] | null> {
  const store = await findStore(client, storeId);
  if (!store) return null;
  const rows = await client.inquiry.findMany({
    where: { storeId: store.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: MAX_ROWS,
    select: { id: true, name: true, email: true, subject: true, message: true, status: true, createdAt: true },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    subject: row.subject ?? "",
    message: row.message,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  }));
}

/** Marks a message of this store Read or Archived (or brings an archived one back as Read). */
export async function setAdminInquiryStatus(
  actor: StoreActor,
  client: PrismaClient,
  storeId: string,
  inquiryId: string,
  from: unknown,
  to: unknown,
) {
  if (!isInquiryStatus(from) || !isInquiryStatus(to) || !nextInquiryStatuses(from).includes(to)) {
    return fail("This status change isn't allowed.");
  }
  return client.$transaction(async (tx) => {
    const store = await findStore(tx, storeId);
    if (!store) return fail(NOT_FOUND.store);
    const inquiry = await tx.inquiry.findFirst({ where: { id: inquiryId, storeId }, select: { status: true } });
    if (!inquiry) return fail(NOT_FOUND.inquiry);
    if (inquiry.status !== from) return fail(CHANGED);

    const updated = await tx.inquiry.updateMany({ where: { id: inquiryId, storeId, status: from }, data: { status: to } });
    if (updated.count !== 1) return fail(CHANGED);
    await recordAudit(tx, {
      action: "inquiry.status_change",
      actorUserId: actor.userId,
      storeId,
      targetType: "inquiry",
      targetId: inquiryId,
      metadata: { from, to },
    });
    return ok({ id: inquiryId }, to === "ARCHIVED" ? "Message archived." : "Message marked as read.");
  });
}
