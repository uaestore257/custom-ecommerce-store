-- Store template selection (Phase 1 template engine).
--
-- ADDITIVE ONLY. Every existing store gets the "classic" template (the
-- storefront design it already has), an empty theme configuration and
-- isDemo = false, so nothing changes visually or functionally until a
-- store owner picks another template. No data is rewritten or removed.
--
-- Rollback (if ever needed, before any store relies on it):
--   ALTER TABLE "Store" DROP CONSTRAINT "Store_templateKey_format",
--     DROP CONSTRAINT "Store_themeConfig_object",
--     DROP COLUMN "templateKey", DROP COLUMN "themeConfig", DROP COLUMN "isDemo";

ALTER TABLE "Store"
  ADD COLUMN "templateKey" VARCHAR(40) NOT NULL DEFAULT 'classic',
  ADD COLUMN "themeConfig" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- Keys are registry identifiers, never paths or component names; theme
-- configuration is always a JSON object. The application still validates
-- both against the code registry on every write and read.
ALTER TABLE "Store"
  ADD CONSTRAINT "Store_templateKey_format" CHECK ("templateKey" ~ '^[a-z][a-z0-9-]{0,39}$'),
  ADD CONSTRAINT "Store_themeConfig_object" CHECK (jsonb_typeof("themeConfig") = 'object');
