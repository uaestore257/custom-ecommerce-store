// ---------------------------------------------------------------
// PASSWORD POLICY for admin accounts (platform owner now, store owners
// later). Used by the platform-owner CLI before a password is handed to
// Better Auth, which hashes it with scrypt. Pure function: no I/O and no
// logging, so a password never ends up in a log line.
// ---------------------------------------------------------------

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

// Small deny-list of passwords (and stems) that meet the length rule but
// are among the most commonly guessed.
const COMMON = [
  "password",
  "passw0rd",
  "123456",
  "qwerty",
  "letmein",
  "welcome",
  "admin",
  "iloveyou",
  "abc123",
  "codexstore",
  "changeme",
];

/** Returns a message explaining why the password is not allowed, or null. */
export function passwordProblem(password: string, email?: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  if (password.length > PASSWORD_MAX_LENGTH) return `Use at most ${PASSWORD_MAX_LENGTH} characters.`;
  if (password.trim() !== password) return "Don't start or end the password with a space.";
  if (new Set(password).size < 6) return "Use more varied characters.";

  const lower = password.toLowerCase();
  if (COMMON.some((word) => lower.includes(word))) return "This password is too easy to guess.";

  const local = email?.split("@")[0]?.toLowerCase();
  if (local && local.length >= 3 && lower.includes(local)) return "Don't include your email address in the password.";
  return null;
}
