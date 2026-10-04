-- Payment transactions and verified provider webhook events.
--
-- These models were added to prisma/schema.prisma together with the
-- Stripe/JazzCash payment architecture, but no migration created them, so
-- a database built only from migrations could not place orders
-- (placeOrder writes a PaymentTransaction). This migration is ADDITIVE and
-- IDEMPOTENT: every statement is guarded, so it is safe both on databases
-- built from migrations (tables missing) and on databases where the tables
-- were already created out of band (e.g. `prisma db push`). It never drops,
-- rewrites or deletes anything.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentTransactionStatus') THEN
    CREATE TYPE "PaymentTransactionStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'REFUNDED');
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "providerAccountId" TEXT,
    "method" TEXT NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "status" "PaymentTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" VARCHAR(64) NOT NULL,
    "providerReference" VARCHAR(255),
    "failureCode" VARCHAR(80),
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PaymentWebhookEvent" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "transactionId" TEXT,
    "eventId" VARCHAR(255) NOT NULL,
    "eventType" VARCHAR(120) NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PaymentTransaction_storeId_orderId_createdAt_idx" ON "PaymentTransaction"("storeId", "orderId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentTransaction_storeId_idempotencyKey_key" ON "PaymentTransaction"("storeId", "idempotencyKey");
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentTransaction_id_storeId_key" ON "PaymentTransaction"("id", "storeId");
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentTransaction_providerAccountId_providerReference_key" ON "PaymentTransaction"("providerAccountId", "providerReference");
CREATE INDEX IF NOT EXISTS "PaymentWebhookEvent_storeId_createdAt_idx" ON "PaymentWebhookEvent"("storeId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentWebhookEvent_providerAccountId_eventId_key" ON "PaymentWebhookEvent"("providerAccountId", "eventId");

-- Foreign keys (composite where they cross store-owned tables, so Postgres
-- itself rejects cross-store links), added only if missing.
DO $$
DECLARE
  fk record;
BEGIN
  FOR fk IN SELECT * FROM (VALUES
    ('PaymentTransaction', 'PaymentTransaction_storeId_fkey',
      'FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE'),
    ('PaymentTransaction', 'PaymentTransaction_orderId_storeId_currency_fkey',
      'FOREIGN KEY ("orderId", "storeId", "currency") REFERENCES "Order"("id", "storeId", "currency") ON DELETE CASCADE ON UPDATE RESTRICT'),
    ('PaymentTransaction', 'PaymentTransaction_currency_fkey',
      'FOREIGN KEY ("currency") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE'),
    ('PaymentTransaction', 'PaymentTransaction_providerAccountId_storeId_fkey',
      'FOREIGN KEY ("providerAccountId", "storeId") REFERENCES "PaymentProviderAccount"("id", "storeId") ON DELETE NO ACTION ON UPDATE RESTRICT'),
    ('PaymentWebhookEvent', 'PaymentWebhookEvent_storeId_fkey',
      'FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE'),
    ('PaymentWebhookEvent', 'PaymentWebhookEvent_providerAccountId_storeId_fkey',
      'FOREIGN KEY ("providerAccountId", "storeId") REFERENCES "PaymentProviderAccount"("id", "storeId") ON DELETE CASCADE ON UPDATE RESTRICT'),
    ('PaymentWebhookEvent', 'PaymentWebhookEvent_transactionId_storeId_fkey',
      'FOREIGN KEY ("transactionId", "storeId") REFERENCES "PaymentTransaction"("id", "storeId") ON DELETE CASCADE ON UPDATE RESTRICT')
  ) AS t(tbl, name, def) LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = fk.name) THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I %s', fk.tbl, fk.name, fk.def);
    END IF;
  END LOOP;
END;
$$;

-- Same rule as every other store-owned table (init migration): a payment
-- record can never be moved to another store.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['PaymentTransaction', 'PaymentWebhookEvent'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = t || '_storeId_immutable') THEN
      EXECUTE format(
        'CREATE TRIGGER %I BEFORE UPDATE OF "storeId" ON %I FOR EACH ROW EXECUTE FUNCTION forbid_store_id_change()',
        t || '_storeId_immutable', t
      );
    END IF;
  END LOOP;
END;
$$;
