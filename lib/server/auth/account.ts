import "server-only";
import { isEmail } from "@/lib/validation";
import type { ActionResult } from "@/lib/admin/types";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import { PASSWORD_MAX_LENGTH, passwordProblem } from "@/lib/auth/password-policy";
import { recordAudit } from "@/lib/server/audit";
import { fail, INVALID, ok, uniqueViolation } from "@/lib/server/admin/common";
import type { Auth } from "./auth";
import { hashCredentialPassword, verifyCredentialPassword } from "./credentials";

function stringField(input: Record<string, unknown>, key: string) {
  return typeof input[key] === "string" ? input[key] as string : "";
}

export async function updateOwnAccount(
  auth: Auth,
  db: PrismaClient,
  userId: string,
  input: unknown,
): Promise<ActionResult<{ requiresSignIn: boolean }>> {
  const raw = input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
  const name = stringField(raw, "name").trim();
  const email = stringField(raw, "email").trim().toLowerCase();
  const currentPassword = stringField(raw, "currentPassword");
  const newPassword = stringField(raw, "newPassword");
  const confirmPassword = stringField(raw, "confirmPassword");
  const fieldErrors: Record<string, string> = {};

  if (name.length < 2 || name.length > 80) fieldErrors.name = "Enter a name between 2 and 80 characters.";
  if (!isEmail(email) || email.length > 254) fieldErrors.email = "Enter a valid email address.";
  if (!currentPassword) fieldErrors.currentPassword = "Enter your current password to confirm changes.";
  else if (currentPassword.length > PASSWORD_MAX_LENGTH) fieldErrors.currentPassword = "The current password is incorrect.";
  if (newPassword) {
    const problem = passwordProblem(newPassword, email);
    if (problem) fieldErrors.newPassword = problem;
    if (newPassword !== confirmPassword) fieldErrors.confirmPassword = "The passwords don't match.";
  } else if (confirmPassword) {
    fieldErrors.confirmPassword = "Enter a new password first.";
  }
  if (Object.keys(fieldErrors).length) return fail(INVALID, fieldErrors);

  const current = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });
  if (!current) return fail("Your account could not be found. Sign in again.");

  const emailChanged = current.email !== email;
  const nameChanged = current.name !== name;
  const passwordChanged = Boolean(newPassword);
  if (!emailChanged && !nameChanged && !passwordChanged) return fail("There are no account changes to save.");

  if (!(await verifyCredentialPassword(auth, db, userId, currentPassword))) {
    return fail(INVALID, { currentPassword: "The current password is incorrect." });
  }
  if (emailChanged && await db.user.findUnique({ where: { email }, select: { id: true } })) {
    return fail(INVALID, { email: "This email is already in use." });
  }
  const passwordHash = passwordChanged ? await hashCredentialPassword(auth, newPassword) : null;
  const changedFields = [
    ...(nameChanged ? ["name"] : []),
    ...(emailChanged ? ["email"] : []),
    ...(passwordChanged ? ["password"] : []),
  ];

  try {
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          name,
          email,
          ...(emailChanged ? { emailVerified: false } : {}),
        },
      });
      if (passwordHash) {
        const account = await tx.account.findUnique({
          where: { providerId_accountId: { providerId: "credential", accountId: userId } },
          select: { id: true },
        });
        if (!account) throw new Error("Credential account missing.");
        await tx.account.update({ where: { id: account.id }, data: { password: passwordHash } });
      }
      if (emailChanged || passwordChanged) await tx.session.deleteMany({ where: { userId } });
      await recordAudit(tx, {
        action: "account.profile_change",
        actorUserId: userId,
        targetType: "user",
        targetId: userId,
        metadata: { changedFields },
      });
    });
  } catch (error) {
    if (uniqueViolation(error)?.includes("email")) return fail(INVALID, { email: "This email is already in use." });
    throw error;
  }

  return ok(
    { requiresSignIn: emailChanged || passwordChanged },
    emailChanged || passwordChanged ? "Account updated. Sign in again with your new credentials." : "Name updated.",
  );
}
