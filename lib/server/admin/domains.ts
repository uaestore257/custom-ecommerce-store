import "server-only";
import { randomBytes } from "node:crypto";
import { resolveTxt } from "node:dns/promises";
import { Prisma, type PrismaClient } from "@/lib/generated/prisma/client";
import type { ActionResult, AdminStoreDomain } from "@/lib/admin/types";
import { hasDomainVerificationRecord, type TxtLookup } from "@/lib/domain-verification";
import { normalizeCustomHostname } from "@/lib/store-domains";
import type { StoreHostConfig } from "@/lib/store-host";
import { recordAudit } from "../audit";

const invalid = (): ActionResult<never> => ({ ok: false, error: "Enter a valid custom hostname." });

class PrimaryDomainChanged extends Error {}

function toView(domain: {
  id: string;
  hostname: string;
  status: AdminStoreDomain["status"];
  isPrimary: boolean;
  verificationToken: string;
  verifiedAt: Date | null;
}): AdminStoreDomain {
  return {
    id: domain.id,
    hostname: domain.hostname,
    status: domain.status,
    isPrimary: domain.isPrimary,
    verificationToken: domain.status === "PENDING" ? domain.verificationToken : null,
    verifiedAt: domain.verifiedAt?.toISOString() ?? null,
  };
}

export async function listStoreDomains(client: PrismaClient, storeId: string): Promise<AdminStoreDomain[]> {
  const domains = await client.storeDomain.findMany({
    where: { storeId },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    select: { id: true, hostname: true, status: true, isPrimary: true, verificationToken: true, verifiedAt: true },
  });
  return domains.map(toView);
}

export async function addStoreDomain(
  client: PrismaClient,
  storeId: string,
  actorUserId: string,
  input: unknown,
  config: StoreHostConfig,
): Promise<ActionResult<AdminStoreDomain>> {
  if (typeof input !== "string") return invalid();
  const hostname = normalizeCustomHostname(input, config);
  if (!hostname) return invalid();
  const existing = await client.storeDomain.findUnique({ where: { hostname } });
  if (existing) {
    if (existing.storeId !== storeId) return { ok: false, error: "This hostname is already assigned." };
    if (existing.status !== "DISABLED") return { ok: false, error: "This hostname is already registered." };
    const domain = await client.storeDomain.update({
      where: { id: existing.id, storeId },
      data: {
        status: "PENDING",
        isPrimary: false,
        verificationToken: randomBytes(18).toString("hex"),
        verifiedAt: null,
      },
      select: { id: true, hostname: true, status: true, isPrimary: true, verificationToken: true, verifiedAt: true },
    });
    await recordAudit(client, {
      action: "store.domain_add",
      actorUserId,
      storeId,
      targetType: "store_domain",
      targetId: domain.id,
      metadata: { hostname, status: domain.status },
    });
    return { ok: true, data: toView(domain) };
  }

  try {
    const domain = await client.storeDomain.create({
      data: { storeId, hostname, verificationToken: randomBytes(18).toString("hex") },
      select: { id: true, hostname: true, status: true, isPrimary: true, verificationToken: true, verifiedAt: true },
    });
    await recordAudit(client, {
      action: "store.domain_add",
      actorUserId,
      storeId,
      targetType: "store_domain",
      targetId: domain.id,
      metadata: { hostname, status: domain.status },
    });
    return { ok: true, data: toView(domain) };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "This hostname is already assigned." };
    }
    throw error;
  }
}

export async function verifyStoreDomain(
  client: PrismaClient,
  storeId: string,
  actorUserId: string,
  domainId: unknown,
  lookup: TxtLookup = (name) => resolveTxt(name),
): Promise<ActionResult<AdminStoreDomain>> {
  if (typeof domainId !== "string" || domainId.length > 64) {
    return { ok: false, error: "This domain is unavailable." };
  }
  const domain = await client.storeDomain.findFirst({
    where: { id: domainId, storeId, status: "PENDING" },
    select: { id: true, hostname: true, status: true, isPrimary: true, verificationToken: true, verifiedAt: true },
  });
  if (!domain) return { ok: false, error: "This pending domain was not found in this store." };

  let verified = false;
  try {
    verified = await hasDomainVerificationRecord(domain.hostname, domain.verificationToken, lookup);
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
    if (code !== "ENODATA" && code !== "ENOTFOUND" && code !== "ENOTIMP" && code !== "ESERVFAIL") throw error;
  }
  if (!verified) return { ok: false, error: "The DNS TXT verification record was not found. It can take time for DNS changes to propagate." };

  const updated = await client.storeDomain.updateMany({
    where: { id: domain.id, storeId, status: "PENDING", verificationToken: domain.verificationToken },
    data: { status: "VERIFIED", verifiedAt: new Date() },
  });
  if (updated.count !== 1) return { ok: false, error: "This domain changed during verification. Reload and try again." };
  await recordAudit(client, {
    action: "store.domain_verify",
    actorUserId,
    storeId,
    targetType: "store_domain",
    targetId: domain.id,
    metadata: { hostname: domain.hostname },
  });
  const verifiedDomain = await client.storeDomain.findFirstOrThrow({
    where: { id: domain.id, storeId },
    select: { id: true, hostname: true, status: true, isPrimary: true, verificationToken: true, verifiedAt: true },
  });
  return { ok: true, data: toView(verifiedDomain) };
}

export async function setPrimaryStoreDomain(
  client: PrismaClient,
  storeId: string,
  actorUserId: string,
  domainId: unknown,
): Promise<ActionResult<undefined>> {
  if (typeof domainId !== "string" || domainId.length > 64) return { ok: false, error: "This domain is unavailable." };
  const domain = await client.storeDomain.findFirst({ where: { id: domainId, storeId, status: "VERIFIED" } });
  if (!domain) return { ok: false, error: "Only a verified domain in this store can be primary." };
  try {
    await client.$transaction(async (tx) => {
      await tx.storeDomain.updateMany({ where: { storeId, status: "VERIFIED", isPrimary: true }, data: { isPrimary: false } });
      const updated = await tx.storeDomain.updateMany({
        where: { id: domain.id, storeId, status: "VERIFIED" },
        data: { isPrimary: true },
      });
      if (updated.count !== 1) throw new PrimaryDomainChanged();
      await recordAudit(tx, {
        action: "store.domain_primary",
        actorUserId,
        storeId,
        targetType: "store_domain",
        targetId: domain.id,
        metadata: { hostname: domain.hostname },
      });
    });
  } catch (error) {
    if (error instanceof PrimaryDomainChanged) {
      return { ok: false, error: "This domain changed during the update. Reload and try again." };
    }
    throw error;
  }
  return { ok: true, data: undefined, message: "Primary domain updated." };
}

export async function disableStoreDomain(
  client: PrismaClient,
  storeId: string,
  actorUserId: string,
  domainId: unknown,
): Promise<ActionResult<undefined>> {
  if (typeof domainId !== "string" || domainId.length > 64) return { ok: false, error: "This domain is unavailable." };
  const updated = await client.storeDomain.updateMany({
    where: { id: domainId, storeId, status: { not: "DISABLED" } },
    data: { status: "DISABLED", isPrimary: false },
  });
  if (updated.count !== 1) return { ok: false, error: "This domain was not found in this store." };
  await recordAudit(client, {
    action: "store.domain_disable",
    actorUserId,
    storeId,
    targetType: "store_domain",
    targetId: domainId,
  });
  return { ok: true, data: undefined, message: "Domain disabled." };
}
