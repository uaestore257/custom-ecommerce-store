-- Agency profile: the single source of truth for the public agency website.
--
-- ADDITIVE ONLY. Extends the existing single-row PlatformSettings (platform
-- data, never related to any Store). All new columns are optional, or have
-- an empty default, so nothing renders until it is filled in on Agency
-- settings. The two lists are JSON arrays; the application validates them
-- on every write and normalizes them on every read.
--
-- Data: records the co-founder named by the agency (name and role only),
-- creating the settings row with the platform's existing fallback name
-- when it does not exist yet. An existing name, email or team is kept.
--
-- Rollback (if ever needed):
--   ALTER TABLE "PlatformSettings" DROP CONSTRAINT "PlatformSettings_team_array",
--     DROP CONSTRAINT "PlatformSettings_socialLinks_array",
--     DROP COLUMN "tagline", DROP COLUMN "description", DROP COLUMN "logoUrl",
--     DROP COLUMN "logoIsWordmark", DROP COLUMN "brandMarkUrl", DROP COLUMN "aboutTitle",
--     DROP COLUMN "aboutBody", DROP COLUMN "team", DROP COLUMN "phone", DROP COLUMN "whatsapp",
--     DROP COLUMN "addressLine", DROP COLUMN "city", DROP COLUMN "region", DROP COLUMN "country",
--     DROP COLUMN "postalCode", DROP COLUMN "businessHours", DROP COLUMN "enquiryEmail",
--     DROP COLUMN "socialLinks", DROP COLUMN "seoTitle", DROP COLUMN "seoDescription",
--     DROP COLUMN "ogImageUrl";

ALTER TABLE "PlatformSettings"
  ADD COLUMN "tagline" VARCHAR(120),
  ADD COLUMN "description" VARCHAR(400),
  ADD COLUMN "logoUrl" VARCHAR(2048),
  ADD COLUMN "logoIsWordmark" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "brandMarkUrl" VARCHAR(2048),
  ADD COLUMN "aboutTitle" VARCHAR(120),
  ADD COLUMN "aboutBody" VARCHAR(4000),
  ADD COLUMN "team" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "phone" VARCHAR(40),
  ADD COLUMN "whatsapp" VARCHAR(40),
  ADD COLUMN "addressLine" VARCHAR(200),
  ADD COLUMN "city" VARCHAR(100),
  ADD COLUMN "region" VARCHAR(100),
  ADD COLUMN "country" VARCHAR(100),
  ADD COLUMN "postalCode" VARCHAR(20),
  ADD COLUMN "businessHours" VARCHAR(200),
  ADD COLUMN "enquiryEmail" VARCHAR(254),
  ADD COLUMN "socialLinks" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "seoTitle" VARCHAR(120),
  ADD COLUMN "seoDescription" VARCHAR(300),
  ADD COLUMN "ogImageUrl" VARCHAR(2048);

ALTER TABLE "PlatformSettings"
  ADD CONSTRAINT "PlatformSettings_team_array" CHECK (jsonb_typeof("team") = 'array'),
  ADD CONSTRAINT "PlatformSettings_socialLinks_array" CHECK (jsonb_typeof("socialLinks") = 'array');

INSERT INTO "PlatformSettings" ("id", "platformName", "team", "updatedAt")
VALUES (1, 'UAE Store', '[{"name": "Muhammad Hamad", "title": "Co-Founder"}]', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE
  SET "team" = EXCLUDED."team"
  WHERE "PlatformSettings"."team" = '[]'::jsonb;
