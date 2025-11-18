-- Add shopifyOrderNumber to Order table
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shopifyOrderNumber" TEXT;

-- For existing Shopify orders, copy orderNumber to shopifyOrderNumber
UPDATE "Order"
SET "shopifyOrderNumber" = "orderNumber"
WHERE "source" = 'shopify' AND "shopifyOrderNumber" IS NULL;

-- For existing Shopify orders, set orderNumber to #id format
UPDATE "Order"
SET "orderNumber" = '#' || "id"::TEXT
WHERE "source" = 'shopify';
