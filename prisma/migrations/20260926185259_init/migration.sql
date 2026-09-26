-- CreateEnum
CREATE TYPE "TextDirection" AS ENUM ('LTR', 'RTL');

-- CreateEnum
CREATE TYPE "StoreStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "StoreRole" AS ENUM ('OWNER', 'MANAGER', 'STAFF');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('TEST', 'LIVE');

-- CreateTable
CREATE TABLE "Country" (
    "code" CHAR(2) NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Currency" (
    "code" CHAR(3) NOT NULL,
    "name" TEXT NOT NULL,
    "minorUnits" INTEGER NOT NULL,

    CONSTRAINT "Currency_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Language" (
    "code" VARCHAR(35) NOT NULL,
    "name" TEXT NOT NULL,
    "nativeName" TEXT NOT NULL,
    "direction" "TextDirection" NOT NULL DEFAULT 'LTR',

    CONSTRAINT "Language_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "PlatformSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "platformName" TEXT NOT NULL,
    "contactEmail" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isPlatformOwner" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "role" "StoreRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "businessType" TEXT,
    "status" "StoreStatus" NOT NULL DEFAULT 'DRAFT',
    "countryCode" CHAR(2) NOT NULL,
    "baseCurrency" CHAR(3) NOT NULL,
    "timezone" TEXT NOT NULL,
    "defaultLanguage" VARCHAR(35) NOT NULL,
    "formatLocale" VARCHAR(35),
    "pricesIncludeTax" BOOLEAN NOT NULL DEFAULT false,
    "logoUrl" TEXT,
    "accentColor" VARCHAR(7),
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "legalName" TEXT,
    "registrationNumber" TEXT,
    "taxId" TEXT,
    "businessAddress" JSONB,
    "orderNumberPrefix" VARCHAR(10),
    "nextOrderNumber" INTEGER NOT NULL DEFAULT 1001,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreLanguage" (
    "storeId" TEXT NOT NULL,
    "languageCode" VARCHAR(35) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreLanguage_pkey" PRIMARY KEY ("storeId","languageCode")
);

-- CreateTable
CREATE TABLE "StoreContentTranslation" (
    "storeId" TEXT NOT NULL,
    "locale" VARCHAR(35) NOT NULL,
    "tagline" TEXT,
    "heroTitle" TEXT,
    "heroText" TEXT,
    "aboutText" TEXT,

    CONSTRAINT "StoreContentTranslation_pkey" PRIMARY KEY ("storeId","locale")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryTranslation" (
    "categoryId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "locale" VARCHAR(35) NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "CategoryTranslation_pkey" PRIMARY KEY ("categoryId","locale")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "categoryId" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductTranslation" (
    "productId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "locale" VARCHAR(35) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "slug" TEXT NOT NULL,

    CONSTRAINT "ProductTranslation_pkey" PRIMARY KEY ("productId","locale")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "title" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "priceMinor" BIGINT NOT NULL,
    "compareAtMinor" BIGINT,
    "currency" CHAR(3) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "altText" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "preferredLocale" VARCHAR(35),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerAddress" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT NOT NULL,
    "region" TEXT,
    "postalCode" TEXT,
    "countryCode" CHAR(2) NOT NULL,
    "phone" TEXT,

    CONSTRAINT "CustomerAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "customerId" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "currency" CHAR(3) NOT NULL,
    "locale" VARCHAR(35) NOT NULL,
    "pricesIncludeTax" BOOLEAN NOT NULL,
    "subtotalMinor" BIGINT NOT NULL,
    "shippingMinor" BIGINT NOT NULL DEFAULT 0,
    "taxMinor" BIGINT NOT NULL DEFAULT 0,
    "discountMinor" BIGINT NOT NULL DEFAULT 0,
    "totalMinor" BIGINT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "shippingAddress" JSONB NOT NULL,
    "billingAddress" JSONB,
    "paymentMethod" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "variantId" TEXT,
    "productName" TEXT NOT NULL,
    "variantTitle" TEXT,
    "sku" TEXT NOT NULL,
    "unitPriceMinor" BIGINT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "taxMinor" BIGINT NOT NULL DEFAULT 0,
    "lineTotalMinor" BIGINT NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxRule" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "region" TEXT,
    "rateBasisPoints" INTEGER NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TaxRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingZone" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ShippingZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingZoneCountry" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "region" TEXT,

    CONSTRAINT "ShippingZoneCountry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingRate" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceMinor" BIGINT NOT NULL,
    "freeOverMinor" BIGINT,
    "currency" CHAR(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ShippingRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentProviderAccount" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "mode" "PaymentMode" NOT NULL DEFAULT 'TEST',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "publicConfig" JSONB NOT NULL DEFAULT '{}',
    "secretRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentProviderAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorePaymentMethod" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "providerAccountId" TEXT,

    CONSTRAINT "StorePaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "StoreMembership_storeId_idx" ON "StoreMembership"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "StoreMembership_userId_storeId_key" ON "StoreMembership"("userId", "storeId");

-- CreateIndex
CREATE UNIQUE INDEX "Store_slug_key" ON "Store"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Store_id_baseCurrency_key" ON "Store"("id", "baseCurrency");

-- CreateIndex
CREATE INDEX "Category_storeId_position_idx" ON "Category"("storeId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Category_id_storeId_key" ON "Category"("id", "storeId");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryTranslation_storeId_locale_slug_key" ON "CategoryTranslation"("storeId", "locale", "slug");

-- CreateIndex
CREATE INDEX "Product_storeId_status_idx" ON "Product"("storeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Product_id_storeId_key" ON "Product"("id", "storeId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductTranslation_storeId_locale_slug_key" ON "ProductTranslation"("storeId", "locale", "slug");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_id_storeId_key" ON "ProductVariant"("id", "storeId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_storeId_sku_key" ON "ProductVariant"("storeId", "sku");

-- CreateIndex
CREATE INDEX "ProductImage_productId_position_idx" ON "ProductImage"("productId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_storeId_email_key" ON "Customer"("storeId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_id_storeId_key" ON "Customer"("id", "storeId");

-- CreateIndex
CREATE INDEX "CustomerAddress_customerId_idx" ON "CustomerAddress"("customerId");

-- CreateIndex
CREATE INDEX "Order_storeId_placedAt_idx" ON "Order"("storeId", "placedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_storeId_number_key" ON "Order"("storeId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Order_id_storeId_currency_key" ON "Order"("id", "storeId", "currency");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "TaxRule_storeId_countryCode_idx" ON "TaxRule"("storeId", "countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingZone_id_storeId_key" ON "ShippingZone"("id", "storeId");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingZoneCountry_zoneId_countryCode_region_key" ON "ShippingZoneCountry"("zoneId", "countryCode", "region");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentProviderAccount_id_storeId_key" ON "PaymentProviderAccount"("id", "storeId");

-- CreateIndex
CREATE UNIQUE INDEX "StorePaymentMethod_storeId_method_key" ON "StorePaymentMethod"("storeId", "method");

-- AddForeignKey
ALTER TABLE "StoreMembership" ADD CONSTRAINT "StoreMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreMembership" ADD CONSTRAINT "StoreMembership_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "Country"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_baseCurrency_fkey" FOREIGN KEY ("baseCurrency") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_defaultLanguage_fkey" FOREIGN KEY ("defaultLanguage") REFERENCES "Language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreLanguage" ADD CONSTRAINT "StoreLanguage_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreLanguage" ADD CONSTRAINT "StoreLanguage_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "Language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreContentTranslation" ADD CONSTRAINT "StoreContentTranslation_storeId_locale_fkey" FOREIGN KEY ("storeId", "locale") REFERENCES "StoreLanguage"("storeId", "languageCode") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryTranslation" ADD CONSTRAINT "CategoryTranslation_categoryId_storeId_fkey" FOREIGN KEY ("categoryId", "storeId") REFERENCES "Category"("id", "storeId") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CategoryTranslation" ADD CONSTRAINT "CategoryTranslation_storeId_locale_fkey" FOREIGN KEY ("storeId", "locale") REFERENCES "StoreLanguage"("storeId", "languageCode") ON DELETE NO ACTION ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_storeId_fkey" FOREIGN KEY ("categoryId", "storeId") REFERENCES "Category"("id", "storeId") ON DELETE NO ACTION ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ProductTranslation" ADD CONSTRAINT "ProductTranslation_productId_storeId_fkey" FOREIGN KEY ("productId", "storeId") REFERENCES "Product"("id", "storeId") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ProductTranslation" ADD CONSTRAINT "ProductTranslation_storeId_locale_fkey" FOREIGN KEY ("storeId", "locale") REFERENCES "StoreLanguage"("storeId", "languageCode") ON DELETE NO ACTION ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_storeId_fkey" FOREIGN KEY ("productId", "storeId") REFERENCES "Product"("id", "storeId") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_storeId_currency_fkey" FOREIGN KEY ("storeId", "currency") REFERENCES "Store"("id", "baseCurrency") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_storeId_fkey" FOREIGN KEY ("productId", "storeId") REFERENCES "Product"("id", "storeId") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerAddress" ADD CONSTRAINT "CustomerAddress_customerId_storeId_fkey" FOREIGN KEY ("customerId", "storeId") REFERENCES "Customer"("id", "storeId") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CustomerAddress" ADD CONSTRAINT "CustomerAddress_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "Country"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_currency_fkey" FOREIGN KEY ("currency") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_storeId_fkey" FOREIGN KEY ("customerId", "storeId") REFERENCES "Customer"("id", "storeId") ON DELETE NO ACTION ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_storeId_currency_fkey" FOREIGN KEY ("orderId", "storeId", "currency") REFERENCES "Order"("id", "storeId", "currency") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_storeId_fkey" FOREIGN KEY ("variantId", "storeId") REFERENCES "ProductVariant"("id", "storeId") ON DELETE NO ACTION ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "TaxRule" ADD CONSTRAINT "TaxRule_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxRule" ADD CONSTRAINT "TaxRule_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "Country"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingZone" ADD CONSTRAINT "ShippingZone_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingZoneCountry" ADD CONSTRAINT "ShippingZoneCountry_zoneId_storeId_fkey" FOREIGN KEY ("zoneId", "storeId") REFERENCES "ShippingZone"("id", "storeId") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ShippingZoneCountry" ADD CONSTRAINT "ShippingZoneCountry_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "Country"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingRate" ADD CONSTRAINT "ShippingRate_zoneId_storeId_fkey" FOREIGN KEY ("zoneId", "storeId") REFERENCES "ShippingZone"("id", "storeId") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ShippingRate" ADD CONSTRAINT "ShippingRate_storeId_currency_fkey" FOREIGN KEY ("storeId", "currency") REFERENCES "Store"("id", "baseCurrency") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PaymentProviderAccount" ADD CONSTRAINT "PaymentProviderAccount_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorePaymentMethod" ADD CONSTRAINT "StorePaymentMethod_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorePaymentMethod" ADD CONSTRAINT "StorePaymentMethod_providerAccountId_storeId_fkey" FOREIGN KEY ("providerAccountId", "storeId") REFERENCES "PaymentProviderAccount"("id", "storeId") ON DELETE NO ACTION ON UPDATE RESTRICT;

-- =====================================================================
-- Hand-written rules that the Prisma schema language cannot express.
-- Prisma does not manage CHECK constraints, partial indexes or triggers,
-- so they stay in place across future migrations.
-- =====================================================================

-- ---------- Standard code formats ----------
ALTER TABLE "Country"  ADD CONSTRAINT "Country_code_iso3166"  CHECK ("code" ~ '^[A-Z]{2}$');
ALTER TABLE "Currency" ADD CONSTRAINT "Currency_code_iso4217" CHECK ("code" ~ '^[A-Z]{3}$');
ALTER TABLE "Currency" ADD CONSTRAINT "Currency_minor_units"  CHECK ("minorUnits" BETWEEN 0 AND 4);
ALTER TABLE "Language" ADD CONSTRAINT "Language_code_bcp47"   CHECK ("code" ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$');

-- ---------- Store ----------
ALTER TABLE "Store" ADD CONSTRAINT "Store_slug_format"    CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
ALTER TABLE "Store" ADD CONSTRAINT "Store_accent_hex"     CHECK ("accentColor" IS NULL OR "accentColor" ~ '^#[0-9a-fA-F]{6}$');
ALTER TABLE "Store" ADD CONSTRAINT "Store_phone_e164"     CHECK ("contactPhone" IS NULL OR "contactPhone" ~ '^\+[1-9][0-9]{6,14}$');
ALTER TABLE "Store" ADD CONSTRAINT "Store_timezone_set"   CHECK (length("timezone") > 0);
ALTER TABLE "Store" ADD CONSTRAINT "Store_next_order_pos" CHECK ("nextOrderNumber" >= 1);

-- ---------- Money and stock are never negative ----------
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_price_nonneg"   CHECK ("priceMinor" >= 0);
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_compare_nonneg" CHECK ("compareAtMinor" IS NULL OR "compareAtMinor" >= 0);
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_stock_nonneg"   CHECK ("stock" >= 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_amounts_nonneg" CHECK (
  "subtotalMinor" >= 0 AND "shippingMinor" >= 0 AND "taxMinor" >= 0 AND "discountMinor" >= 0 AND "totalMinor" >= 0
);
ALTER TABLE "Order" ADD CONSTRAINT "Order_number_pos" CHECK ("number" >= 1);
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_quantity_pos" CHECK ("quantity" > 0);
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_amounts_nonneg" CHECK (
  "unitPriceMinor" >= 0 AND "taxMinor" >= 0 AND "lineTotalMinor" >= 0
);
ALTER TABLE "ShippingRate" ADD CONSTRAINT "ShippingRate_amounts_nonneg" CHECK (
  "priceMinor" >= 0 AND ("freeOverMinor" IS NULL OR "freeOverMinor" >= 0)
);
ALTER TABLE "TaxRule" ADD CONSTRAINT "TaxRule_rate_range" CHECK ("rateBasisPoints" BETWEEN 0 AND 100000);

-- ---------- Customers: emails stored lower-case ----------
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_email_lowercase" CHECK ("email" = lower("email"));

-- ---------- Exactly one default variant per product ----------
CREATE UNIQUE INDEX "ProductVariant_one_default_per_product"
  ON "ProductVariant" ("productId") WHERE "isDefault";

-- ---------- Every product must have a default variant (checked at COMMIT) ----------
CREATE FUNCTION product_requires_default_variant() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  pid text;
BEGIN
  IF TG_TABLE_NAME = 'Product' THEN
    pid := NEW."id";
  ELSE
    pid := OLD."productId";
  END IF;
  -- Nothing to check if the product itself no longer exists.
  IF EXISTS (SELECT 1 FROM "Product" WHERE "id" = pid)
     AND NOT EXISTS (SELECT 1 FROM "ProductVariant" WHERE "productId" = pid AND "isDefault") THEN
    RAISE EXCEPTION 'Product % must have a default variant', pid
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "Product_has_default_variant"
  AFTER INSERT ON "Product"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION product_requires_default_variant();

CREATE CONSTRAINT TRIGGER "ProductVariant_keeps_default"
  AFTER UPDATE OR DELETE ON "ProductVariant"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION product_requires_default_variant();

-- ---------- A store's default language must be enabled for that store (checked at COMMIT) ----------
CREATE FUNCTION store_default_language_enabled() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  sid text;
BEGIN
  IF TG_TABLE_NAME = 'Store' THEN
    sid := NEW."id";
  ELSE
    sid := OLD."storeId";
  END IF;
  IF EXISTS (SELECT 1 FROM "Store" WHERE "id" = sid)
     AND NOT EXISTS (
       SELECT 1 FROM "Store" s
       JOIN "StoreLanguage" sl ON sl."storeId" = s."id" AND sl."languageCode" = s."defaultLanguage"
       WHERE s."id" = sid AND sl."enabled"
     ) THEN
    RAISE EXCEPTION 'Store % default language must be an enabled store language', sid
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "Store_default_language_enabled"
  AFTER INSERT OR UPDATE ON "Store"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION store_default_language_enabled();

CREATE CONSTRAINT TRIGGER "StoreLanguage_keeps_default"
  AFTER UPDATE OR DELETE ON "StoreLanguage"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION store_default_language_enabled();

-- ---------- storeId can never change: records cannot move between stores ----------
CREATE FUNCTION forbid_store_id_change() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."storeId" IS DISTINCT FROM OLD."storeId" THEN
    RAISE EXCEPTION 'storeId of % cannot be changed', TG_TABLE_NAME
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'StoreMembership', 'StoreLanguage', 'StoreContentTranslation',
    'Category', 'CategoryTranslation', 'Product', 'ProductTranslation',
    'ProductVariant', 'ProductImage', 'Customer', 'CustomerAddress',
    'Order', 'OrderItem', 'TaxRule', 'ShippingZone', 'ShippingZoneCountry',
    'ShippingRate', 'PaymentProviderAccount', 'StorePaymentMethod'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE OF "storeId" ON %I FOR EACH ROW EXECUTE FUNCTION forbid_store_id_change()',
      t || '_storeId_immutable', t
    );
  END LOOP;
END;
$$;
