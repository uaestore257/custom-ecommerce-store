import type { DbInquiryStatus } from "./types";

// ---------------------------------------------------------------
// CONTACT MESSAGE (INQUIRY) STATUS RULES, shared by the admin inbox and
// the server (lib/server/admin/inquiries.ts), which enforces them.
//
//   New      -> Read or Archived
//   Read     -> Archived
//   Archived -> Read (brings it back to the inbox)
//
// Nothing goes back to New: "New" only means no one has looked at it yet.
// ---------------------------------------------------------------

export const INQUIRY_STATUS_VALUES: readonly DbInquiryStatus[] = ["NEW", "READ", "ARCHIVED"];

export function isInquiryStatus(value: unknown): value is DbInquiryStatus {
  return typeof value === "string" && INQUIRY_STATUS_VALUES.includes(value as DbInquiryStatus);
}

/** The statuses a message can be moved to from `status`. */
export function nextInquiryStatuses(status: DbInquiryStatus): DbInquiryStatus[] {
  if (status === "NEW") return ["READ", "ARCHIVED"];
  if (status === "READ") return ["ARCHIVED"];
  return ["READ"];
}
