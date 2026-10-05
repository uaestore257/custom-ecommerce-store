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
import { messagesFor, type ValidationMessages } from "./storefront-i18n";
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

/** `messages`: the shopper's UI language (lib/storefront-i18n.ts); the server validates in English. */
export function validateInquiry(
  input: unknown,
  messages: ValidationMessages = messagesFor("en").validation,
): { values: CleanInquiry; errors: InquiryFieldErrors } {
  const tooLong = (value: string, max: number) => (value.length > max ? messages.tooLong(max) : undefined);
  const raw = record(input);
  const values: CleanInquiry = {
    name: str(raw, "name"),
    email: str(raw, "email"),
    subject: str(raw, "subject"),
    message: str(raw, "message"),
  };
  const errors: InquiryFieldErrors = {
    name:
      values.name.length < 2 ? messages.name : tooLong(values.name, INQUIRY_LIMITS.name),
    email: !isEmail(values.email) ? messages.email : tooLong(values.email, INQUIRY_LIMITS.email),
    subject: tooLong(values.subject, INQUIRY_LIMITS.subject),
    message:
      values.message.length < 10
        ? messages.messageTooShort
        : tooLong(values.message, INQUIRY_LIMITS.message),
  };
  return { values, errors };
}
