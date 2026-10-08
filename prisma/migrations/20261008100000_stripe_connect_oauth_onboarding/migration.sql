ALTER TABLE "PaymentProviderAccount"
ADD COLUMN "stripeAccountId" VARCHAR(255);

UPDATE "PaymentProviderAccount"
SET "stripeAccountId" = "publicConfig"->>'accountId'
WHERE "provider" = 'stripe_connect'
  AND jsonb_typeof("publicConfig") = 'object'
  AND "publicConfig"->>'accountId' ~ '^acct_[A-Za-z0-9]+$';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "PaymentProviderAccount"
    WHERE "stripeAccountId" IS NOT NULL
    GROUP BY "stripeAccountId", "mode"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Stripe Connect account IDs are assigned to multiple provider records in the same mode; resolve ownership before applying this migration.';
  END IF;
END $$;

CREATE UNIQUE INDEX "PaymentProviderAccount_stripeAccountId_mode_key"
ON "PaymentProviderAccount"("stripeAccountId", "mode");

CREATE TABLE "StripeConnectOAuthState" (
    "id" TEXT NOT NULL,
    "stateHash" CHAR(64) NOT NULL,
    "storeId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "mode" "PaymentMode" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StripeConnectOAuthState_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "StripeConnectOAuthState_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StripeConnectOAuthState_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "StripeConnectOAuthState_stateHash_key"
ON "StripeConnectOAuthState"("stateHash");

CREATE INDEX "StripeConnectOAuthState_expiresAt_idx"
ON "StripeConnectOAuthState"("expiresAt");
