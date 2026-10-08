ALTER TYPE "PaymentStatus" ADD VALUE 'PARTIALLY_REFUNDED';
ALTER TYPE "PaymentStatus" ADD VALUE 'REFUNDED';

ALTER TYPE "PaymentTransactionStatus" ADD VALUE 'RECONCILIATION';
ALTER TYPE "PaymentTransactionStatus" ADD VALUE 'PARTIALLY_REFUNDED';

ALTER TABLE "PaymentTransaction"
ADD COLUMN "checkoutAttempt" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "PaymentTransaction"
ADD COLUMN "checkoutAttemptStartedAt" TIMESTAMP(3);

CREATE TABLE "PaymentRefund" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "stripeRefundId" VARCHAR(255) NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentRefund_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PaymentRefund_amountMinor_check" CHECK ("amountMinor" > 0),
    CONSTRAINT "PaymentRefund_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PaymentRefund_orderId_storeId_currency_fkey" FOREIGN KEY ("orderId", "storeId", "currency") REFERENCES "Order"("id", "storeId", "currency") ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT "PaymentRefund_transactionId_storeId_fkey" FOREIGN KEY ("transactionId", "storeId") REFERENCES "PaymentTransaction"("id", "storeId") ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT "PaymentRefund_providerAccountId_storeId_fkey" FOREIGN KEY ("providerAccountId", "storeId") REFERENCES "PaymentProviderAccount"("id", "storeId") ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT "PaymentRefund_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PaymentRefund_providerAccountId_stripeRefundId_key" ON "PaymentRefund"("providerAccountId", "stripeRefundId");
CREATE INDEX "PaymentRefund_storeId_orderId_createdAt_idx" ON "PaymentRefund"("storeId", "orderId", "createdAt");
CREATE INDEX "PaymentRefund_transactionId_createdAt_idx" ON "PaymentRefund"("transactionId", "createdAt");
