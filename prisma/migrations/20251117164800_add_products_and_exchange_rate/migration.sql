-- Add venueId to ShopifyStore if not exists
ALTER TABLE "ShopifyStore" ADD COLUMN IF NOT EXISTS "venueId" INTEGER;

-- Ensure default venue exists (in case this migration runs before venue setup)
INSERT INTO "Venue" ("name", "slug")
VALUES ('CICCIO', 'ciccio')
ON CONFLICT ("slug") DO NOTHING;

-- Set default venueId for existing stores
UPDATE "ShopifyStore"
SET "venueId" = v.id
FROM "Venue" v
WHERE "ShopifyStore"."venueId" IS NULL
  AND v."slug" = 'ciccio';

-- Make venueId required
ALTER TABLE "ShopifyStore"
  ALTER COLUMN "venueId" SET NOT NULL;

-- Add foreign key constraint for ShopifyStore.venueId
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ShopifyStore_venueId_fkey'
    ) THEN
        ALTER TABLE "ShopifyStore" ADD CONSTRAINT "ShopifyStore_venueId_fkey"
          FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateTable Product
CREATE TABLE IF NOT EXISTS "Product" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "shopifyProductId" TEXT,
    "egpPrice" DOUBLE PRECISION NOT NULL,
    "venueId" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable ExchangeRate
CREATE TABLE IF NOT EXISTS "ExchangeRate" (
    "id" SERIAL NOT NULL,
    "fromCurrency" TEXT NOT NULL,
    "toCurrency" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Product_shopifyProductId_idx" ON "Product"("shopifyProductId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Product_sku_venueId_key" ON "Product"("sku", "venueId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ExchangeRate_fromCurrency_toCurrency_key" ON "ExchangeRate"("fromCurrency", "toCurrency");

-- AddForeignKey Product.venueId
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Product_venueId_fkey'
    ) THEN
        ALTER TABLE "Product" ADD CONSTRAINT "Product_venueId_fkey"
          FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
