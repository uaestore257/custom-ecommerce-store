import "server-only";
import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@/lib/generated/prisma/client";
import type { Auth } from "./auth";

type Db = PrismaClient | Prisma.TransactionClient;

export async function hashCredentialPassword(auth: Auth, password: string) {
  return (await auth.$context).password.hash(password);
}

export async function verifyCredentialPassword(auth: Auth, db: Db, userId: string, password: string) {
  const account = await db.account.findUnique({
    where: { providerId_accountId: { providerId: "credential", accountId: userId } },
    select: { password: true },
  });
  if (!account?.password) return false;
  const context = await auth.$context;
  return context.password.verify({ hash: account.password, password });
}

export async function saveCredentialPassword(tx: Prisma.TransactionClient, userId: string, passwordHash: string) {
  await tx.account.upsert({
    where: { providerId_accountId: { providerId: "credential", accountId: userId } },
    create: {
      id: randomUUID(),
      userId,
      accountId: userId,
      providerId: "credential",
      password: passwordHash,
    },
    update: { password: passwordHash },
  });
}
