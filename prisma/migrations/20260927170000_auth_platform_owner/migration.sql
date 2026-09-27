-- AlterTable
ALTER TABLE "User" ADD COLUMN     "disabledAt" TIMESTAMP(3),
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "image" TEXT;

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "idToken" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "lastRequest" BIGINT NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "storeId" TEXT,
    "action" VARCHAR(64) NOT NULL,
    "targetType" VARCHAR(32),
    "targetId" VARCHAR(64),
    "metadata" JSONB,
    "ipAddress" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_providerId_accountId_key" ON "Account"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimit_key_key" ON "RateLimit"("key");

-- CreateIndex
CREATE INDEX "AuditEvent_storeId_createdAt_idx" ON "AuditEvent"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_actorUserId_createdAt_idx" ON "AuditEvent"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_action_createdAt_idx" ON "AuditEvent"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- =====================================================================
-- Hand-written rules (not managed by Prisma; kept by later migrations).
-- =====================================================================

-- Phase 1 seed data marked the demo agency user as platform owner. That
-- user has no password and nobody can sign in yet, so clearing the flag
-- removes no one's access. The real platform owner is created afterwards
-- with `npm run platform:create-owner`. No rows are deleted.
UPDATE "User" SET "isPlatformOwner" = false WHERE "isPlatformOwner";

-- At most ONE platform owner can ever exist. Every platform-owner row maps
-- to the same index key (true), so a second one is a unique violation.
CREATE UNIQUE INDEX "User_single_platform_owner" ON "User" ((true)) WHERE "isPlatformOwner";

-- Audit events are append-only: they can be added but never edited or
-- deleted. The only allowed update is clearing a reference when the
-- actor or store is deleted (ON DELETE SET NULL).
CREATE FUNCTION audit_event_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'AuditEvent rows cannot be deleted';
  END IF;
  IF NEW."id" IS DISTINCT FROM OLD."id"
     OR NEW."action" IS DISTINCT FROM OLD."action"
     OR NEW."targetType" IS DISTINCT FROM OLD."targetType"
     OR NEW."targetId" IS DISTINCT FROM OLD."targetId"
     OR NEW."metadata"::text IS DISTINCT FROM OLD."metadata"::text
     OR NEW."ipAddress" IS DISTINCT FROM OLD."ipAddress"
     OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
     OR (NEW."actorUserId" IS DISTINCT FROM OLD."actorUserId" AND NEW."actorUserId" IS NOT NULL)
     OR (NEW."storeId" IS DISTINCT FROM OLD."storeId" AND NEW."storeId" IS NOT NULL) THEN
    RAISE EXCEPTION 'AuditEvent rows cannot be modified';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_event_append_only
  BEFORE UPDATE OR DELETE ON "AuditEvent"
  FOR EACH ROW EXECUTE FUNCTION audit_event_append_only();
