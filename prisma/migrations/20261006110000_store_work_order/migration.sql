-- Optional explicit display order for demo stores in their Work category.
ALTER TABLE "Store"
  ADD COLUMN "workOrder" INTEGER;
