import "server-only";
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import { passwordProblem } from "@/lib/auth/password-policy";
import { recordAudit } from "@/lib/server/audit";
import type { Auth } from "./auth";

export type DemoStoreOwnerSlug = "nest-and-oak" | "threadline" | "voltbox";

export const DEMO_STORE_OWNERS = [
  {
    slug: "nest-and-oak",
    email: "nest.owner@example.local",
    passwordVariable: "DEMO_NEST_AND_OAK_OWNER_PASSWORD",
  },
  {
    slug: "threadline",
    email: "urban.owner@example.local",
    passwordVariable: "DEMO_THREADLINE_OWNER_PASSWORD",
  },
  {
    slug: "voltbox",
    email: "modern.owner@example.local",
    passwordVariable: "DEMO_VOLTBOX_OWNER_PASSWORD",
  },
] as const;

export type DemoStoreOwnerPasswords = Record<DemoStoreOwnerSlug, string>;
type DemoPasswordEnvironment = Record<string, string | undefined>;

function requiredDemoPassword(env: DemoPasswordEnvironment, name: string) {
  const value = env[name];
  if (!value) throw new Error(`Set ${name} in the local environment before provisioning demo owners.`);
  return value;
}

export function getDemoStoreOwnerPasswords(env: DemoPasswordEnvironment = process.env): DemoStoreOwnerPasswords {
  return {
    "nest-and-oak": requiredDemoPassword(env, "DEMO_NEST_AND_OAK_OWNER_PASSWORD"),
    threadline: requiredDemoPassword(env, "DEMO_THREADLINE_OWNER_PASSWORD"),
    voltbox: requiredDemoPassword(env, "DEMO_VOLTBOX_OWNER_PASSWORD"),
  };
}

export interface DemoOwnerProvisionResult {
  slug: DemoStoreOwnerSlug;
  email: string;
  userId: string;
}

export async function provisionDemoStoreOwners(
  auth: Auth,
  db: PrismaClient,
  passwords: DemoStoreOwnerPasswords,
): Promise<DemoOwnerProvisionResult[]> {
  const context = await auth.$context;
  const hashes = await Promise.all(
    DEMO_STORE_OWNERS.map(({ email, slug }) => {
      const password = passwords[slug];
      const issue = passwordProblem(password, email);
      if (issue) throw new Error(`Demo owner credential configuration is invalid for "${email}": ${issue}`);
      return context.password.hash(password);
    }),
  );

  return db.$transaction(async (tx) => {
    const plans: {
      slug: DemoStoreOwnerSlug;
      email: string;
      userId: string | null;
      needsMembership: boolean;
      storeId: string;
      name: string;
      existingPasswordHash: string | null;
      passwordHash: string;
      updateEmail: boolean;
    }[] = [];
    const plannedEmails = new Set<string>();

    for (const [index, demoOwner] of DEMO_STORE_OWNERS.entries()) {
      const store = await tx.store.findUnique({
        where: { slug: demoOwner.slug },
        select: { id: true, name: true },
      });
      if (!store) throw new Error(`Demo store slug "${demoOwner.slug}" was not found; no owners were changed.`);

      const owners = await tx.storeMembership.findMany({
        where: { storeId: store.id, role: "OWNER" },
        include: { user: { select: { id: true, name: true, email: true, isPlatformOwner: true, disabledAt: true } } },
        take: 2,
      });
      if (owners.length > 1) throw new Error(`Store "${demoOwner.slug}" has multiple OWNER memberships; resolve them before provisioning.`);

      const currentOwner = owners[0]?.user;
      const targetEmailUser = await tx.user.findUnique({
        where: { email: demoOwner.email },
        select: { id: true, name: true, email: true, isPlatformOwner: true, disabledAt: true },
      });
      if (targetEmailUser && currentOwner && targetEmailUser.id !== currentOwner.id) {
        throw new Error(`Demo email "${demoOwner.email}" belongs to a different user; refusing to merge accounts.`);
      }
      const owner = currentOwner ?? targetEmailUser;
      if (owner?.isPlatformOwner) throw new Error(`Refusing to provision platform owner email "${demoOwner.email}".`);
      if (owner?.disabledAt) throw new Error(`Owner account for "${demoOwner.slug}" is disabled; enable it through the intended admin workflow first.`);
      if (owner && plannedEmails.has(owner.email) && owner.email !== demoOwner.email) {
        throw new Error(`One existing user is mapped to multiple demo stores; refusing to share an owner account.`);
      }
      if (plannedEmails.has(demoOwner.email)) throw new Error(`Duplicate demo owner email configured: "${demoOwner.email}".`);
      plannedEmails.add(demoOwner.email);

      if (owner) {
        const memberships = await tx.storeMembership.findMany({
          where: { userId: owner.id },
          select: { storeId: true, role: true },
        });
        if (memberships.some((membership) => membership.storeId !== store.id)) {
          throw new Error(`Owner for "${demoOwner.slug}" is assigned to another store; refusing cross-store reuse.`);
        }
        if (memberships.length !== owners.length) {
          throw new Error(`Owner membership for "${demoOwner.slug}" is inconsistent; no owners were changed.`);
        }
      }

      const account = owner
        ? await tx.account.findUnique({
            where: { providerId_accountId: { providerId: "credential", accountId: owner.id } },
            select: { password: true },
          })
        : null;
      plans.push({
        slug: demoOwner.slug,
        email: demoOwner.email,
        userId: owner?.id ?? null,
        needsMembership: owners.length === 0,
        storeId: store.id,
        name: owner?.name ?? `${store.name} Owner`,
        existingPasswordHash: account?.password ?? null,
        passwordHash: hashes[index],
        updateEmail: owner?.email !== demoOwner.email,
      });
    }

    const results: DemoOwnerProvisionResult[] = [];
    for (const plan of plans) {
      const demoOwner = DEMO_STORE_OWNERS.find((item) => item.slug === plan.slug);
      if (!demoOwner) throw new Error(`Missing demo owner configuration for "${plan.slug}".`);
      const currentPasswordIsDemo =
        plan.existingPasswordHash !== null &&
        (await context.password.verify({ hash: plan.existingPasswordHash, password: passwords[demoOwner.slug] }));
      const user = plan.userId
        ? await tx.user.update({
            where: { id: plan.userId },
            data: {
              email: plan.email,
              ...(plan.updateEmail ? { emailVerified: false } : {}),
            },
            select: { id: true },
          })
        : await tx.user.create({
            data: { email: plan.email, name: plan.name, emailVerified: false },
            select: { id: true },
          });

      await tx.storeMembership.upsert({
        where: { userId_storeId: { userId: user.id, storeId: plan.storeId } },
        create: { userId: user.id, storeId: plan.storeId, role: "OWNER" },
        update: { role: "OWNER" },
      });

      const changed = !plan.userId || plan.needsMembership || plan.updateEmail || !currentPasswordIsDemo;
      if (!currentPasswordIsDemo) {
        await tx.account.upsert({
          where: { providerId_accountId: { providerId: "credential", accountId: user.id } },
          create: {
            id: randomUUID(),
            userId: user.id,
            accountId: user.id,
            providerId: "credential",
            password: plan.passwordHash,
          },
          update: { password: plan.passwordHash },
        });
      }
      if (changed) {
        await tx.session.deleteMany({ where: { userId: user.id } });
        await recordAudit(tx, {
          action: "store.owner_change",
          storeId: plan.storeId,
          targetType: "user",
          targetId: user.id,
          metadata: { changedFields: ["email", "password"] },
        });
      }
      results.push({ slug: plan.slug, email: plan.email, userId: user.id });
    }
    return results;
  });
}

export function describeSafeDemoOwnerDatabase(databaseUrl: string | undefined, nodeEnv: string | undefined) {
  if (nodeEnv === "production") throw new Error("Refusing demo owner provisioning in production.");
  if (!databaseUrl) throw new Error("DATABASE_URL is missing.");
  let target: URL;
  try {
    target = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL is invalid.");
  }
  if (!["localhost", "127.0.0.1", "[::1]"].includes(target.hostname)) {
    throw new Error("Demo owner provisioning is allowed only on a local PostgreSQL host.");
  }
  const database = decodeURIComponent(target.pathname.slice(1));
  if (!/(^|[_-])(dev|local|demo)($|[_-])/i.test(database) || /(^|[_-])test($|[_-])/i.test(database)) {
    throw new Error("Demo owner provisioning requires a local dev/local/demo database, not a test or production database.");
  }
  return {
    database,
    host: target.hostname,
    port: target.port || "5432",
  };
}
