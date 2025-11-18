-- Add shopifyProductId to OrderLineItem
ALTER TABLE "OrderLineItem" ADD COLUMN IF NOT EXISTS "shopifyProductId" TEXT;
