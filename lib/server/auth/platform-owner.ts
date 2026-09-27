import "server-only";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import { passwordProblem } from "@/lib/auth/password-policy";
import { isEmail } from "@/lib/validation";
import { recordAudit } from "@/lib/server/audit";
import type { Auth } from "./auth";

// ---------------------------------------------------------------
// PLATFORM OWNER ACCOUNT — used only by the CLI (scripts/platform-owner.ts).
// There is no web page, Server Action or API that calls these.
//
// Better Auth has no documented server API for creating a password user
// while public sign-up is disabled, so this uses the same internal steps
// as its own sign-up endpoint (better-auth 1.7.6, api/routes/sign-up):
// hash with Better Auth's scrypt, create the user, link a "credential"
// account. tests/db/auth-platform-owner.test.ts signs in with the result,
// so an incompatible Better Auth upgrade fails the tests.
// ---------------------------------------------------------------

export class PlatformOwnerError extends Error {}

function cleanEmail(value: string) {
  const email = value.trim().toLowerCase();
  if (!isEmail(email) || email.length > 254) throw new PlatformOwnerError("Enter a valid email address.");
  return email;
}

function checkPassword(password: string, email: string) {
  const problem = passwordProblem(password, email);
  if (problem) throw new PlatformOwnerError(problem);
}

export async function createPlatformOwner(
  auth: Auth,
  db: PrismaClient,
  input: { email: string; name: string; password: string },
) {
  const email = cleanEmail(input.email);
  const name = input.name.trim();
  if (name.length < 2 || name.length > 80) throw new PlatformOwnerError("Enter a name between 2 and 80 characters.");
  checkPassword(input.password, email);

  if (await db.user.findFirst({ where: { isPlatformOwner: true }, select: { id: true } })) {
    throw new PlatformOwnerError("A platform owner already exists. Use platform:reset-password instead.");
  }
  if (await db.user.findUnique({ where: { email }, select: { id: true } })) {
    throw new PlatformOwnerError("A user with this email already exists. Use a different email for the platform owner.");
  }

  const ctx = await auth.$context;
  const hash = await ctx.password.hash(input.password);
  const user = await ctx.internalAdapter.createUser({ email, name, emailVerified: false }, { method: "admin" });
  try {
    await ctx.internalAdapter.linkAccount({ userId: user.id, providerId: "credential", accountId: user.id, password: hash });
    // The partial unique index "User_single_platform_owner" makes this fail
    // if another platform owner was created in the meantime.
    await db.user.update({ where: { id: user.id }, data: { isPlatformOwner: true } });
  } catch (error) {
    await db.user.delete({ where: { id: user.id } }); // also removes the linked account
    throw error;
  }
  await recordAudit(db, { action: "platform_owner.create", actorUserId: user.id, targetType: "user", targetId: user.id });
  return { id: user.id, email };
}

/** Sets a new password and signs the platform owner out everywhere. */
export async function resetPlatformOwnerPassword(auth: Auth, db: PrismaClient, input: { email: string; password: string }) {
  const email = cleanEmail(input.email);
  const owner = await db.user.findFirst({ where: { isPlatformOwner: true, email }, select: { id: true } });
  if (!owner) throw new PlatformOwnerError("No platform owner has this email.");
  checkPassword(input.password, email);

  const ctx = await auth.$context;
  const hash = await ctx.password.hash(input.password);
  const accounts = await ctx.internalAdapter.findAccounts(owner.id);
  if (accounts.some((a) => a.providerId === "credential")) await ctx.internalAdapter.updatePassword(owner.id, hash);
  else await ctx.internalAdapter.linkAccount({ userId: owner.id, providerId: "credential", accountId: owner.id, password: hash });

  await ctx.internalAdapter.deleteUserSessions(owner.id);
  await db.session.deleteMany({ where: { userId: owner.id } }); // belt and braces: no session survives
  await recordAudit(db, { action: "platform_owner.password_reset", actorUserId: owner.id, targetType: "user", targetId: owner.id });
  return { id: owner.id, email };
}
