ALTER TABLE "Product"
  ADD COLUMN "deliveryFeeMinor" BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN "freeDelivery" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "pickupOnly" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Product"
  ADD CONSTRAINT "Product_delivery_options_valid" CHECK (
    "deliveryFeeMinor" >= 0
    AND NOT ("freeDelivery" AND "pickupOnly")
    AND (NOT "freeDelivery" OR "deliveryFeeMinor" = 0)
    AND (NOT "pickupOnly" OR "deliveryFeeMinor" = 0)
  );
