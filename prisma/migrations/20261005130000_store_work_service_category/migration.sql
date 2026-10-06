-- Optional, explicit Services-category assignment for the public Work page.
-- Existing demo stores remain unassigned until a platform owner classifies them.
ALTER TABLE "Store"
  ADD COLUMN "workServiceSlug" VARCHAR(40);
