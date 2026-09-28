// ---------------------------------------------------------------
// STORE CONTACT INQUIRY — validation shared by the Contact form and the
// server. The server ALWAYS re-validates: this takes untrusted input
// (anything a browser could POST) and returns either clean values or
// field errors. Only name/email/subject/message are read here — an
// unknown field (e.g. a storeId placed in this same object) is simply
// not one of the keys this function looks at.
//
// The store itself is NOT handled here and is NOT server-derived: it is
// a caller-supplied Server Action argument (see
// app/(storefront)/actions.ts), which lib/server/inquiries.ts
// re-validates against the database — see that file's comment on
// submitInquiry() for the full trust-boundary explanation.
// ---------------------------------------------------------------
import { isEmail } from "./validation";

export type InquiryFieldErrors = Partial<Record<"name" | "email" | "subject" | "message", string>>;

export interface CleanInquiry {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export const INQUIRY_LIMITS = {
  name: 80,
  email: 254,
  subject: 150,
  message: 4000,
} as const;

function record(input: unknown): Record<string, unknown> {
  return input && typeof input === "object" && !Array.isArray(input) ? (input as Record<string, unknown>) : {};
}

function str(input: Record<string, unknown>, key: string) {
  const value = input[key];
  return typeof value === "string" ? value.trim() : "";
}

function tooLong(value: string, max: number) {
  return value.length > max ? `Keep this under ${max} characters.` : undefined;
}

export function validateInquiry(input: unknown): { values: CleanInquiry; errors: InquiryFieldErrors } {
  const raw = record(input);
  const values: CleanInquiry = {
    name: str(raw, "name"),
    email: str(raw, "email"),
    subject: str(raw, "subject"),
    message: str(raw, "message"),
  };
  const errors: InquiryFieldErrors = {
    name:
      values.name.length < 2 ? "Please enter your name." : tooLong(values.name, INQUIRY_LIMITS.name),
    email: !isEmail(values.email) ? "Please enter a valid email address." : tooLong(values.email, INQUIRY_LIMITS.email),
    subject: tooLong(values.subject, INQUIRY_LIMITS.subject),
    message:
      values.message.length < 10
        ? "Please write at least 10 characters."
        : tooLong(values.message, INQUIRY_LIMITS.message),
  };
  return { values, errors };
}
