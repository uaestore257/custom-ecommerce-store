CREATE TYPE "StoreDomainStatus" AS ENUM ('PENDING', 'VERIFIED', 'DISABLED');

CREATE TABLE "StoreDomain" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "hostname" VARCHAR(253) NOT NULL,
    "status" "StoreDomainStatus" NOT NULL DEFAULT 'PENDING',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "verificationToken" VARCHAR(64) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreDomain_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "StoreDomain_primary_is_verified" CHECK (NOT "isPrimary" OR "status" = 'VERIFIED'),
    CONSTRAINT "StoreDomain_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "StoreDomain_hostname_key" ON "StoreDomain"("hostname");
CREATE INDEX "StoreDomain_storeId_status_idx" ON "StoreDomain"("storeId", "status");
CREATE UNIQUE INDEX "StoreDomain_one_verified_primary_per_store"
    ON "StoreDomain"("storeId")
    WHERE "status" = 'VERIFIED' AND "isPrimary" = true;
