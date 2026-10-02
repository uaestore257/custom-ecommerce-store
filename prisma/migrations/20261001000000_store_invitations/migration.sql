CREATE TABLE "StoreInvitation" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "invitedByUserId" TEXT NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "role" "StoreRole" NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreInvitation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "StoreInvitation_role_check" CHECK ("role" IN ('MANAGER', 'STAFF'))
);

CREATE UNIQUE INDEX "StoreInvitation_tokenHash_key" ON "StoreInvitation"("tokenHash");
CREATE UNIQUE INDEX "StoreInvitation_one_pending_per_store_email"
    ON "StoreInvitation"("storeId", "email")
    WHERE "acceptedAt" IS NULL AND "revokedAt" IS NULL;
CREATE INDEX "StoreInvitation_storeId_createdAt_idx" ON "StoreInvitation"("storeId", "createdAt");
CREATE INDEX "StoreInvitation_storeId_email_idx" ON "StoreInvitation"("storeId", "email");

ALTER TABLE "StoreInvitation"
    ADD CONSTRAINT "StoreInvitation_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StoreInvitation"
    ADD CONSTRAINT "StoreInvitation_invitedByUserId_fkey"
    FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
