-- CreateTable
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
CREATE UNIQUE INDEX IF NOT EXISTS "ExchangeRate_fromCurrency_toCurrency_key" ON "ExchangeRate"("fromCurrency", "toCurrency");

-- AlterTable ShopifyStore: Add venueId column (nullable first, then make required after setting defaults)
ALTER TABLE "ShopifyStore" ADD COLUMN IF NOT EXISTS "venueId" INTEGER;

-- Get the first venue ID to use as default for existing stores
-- This SQL will fail gracefully if there are no venues yet
DO $$
DECLARE
    default_venue_id INTEGER;
BEGIN
    -- Get the first venue ID
    SELECT id INTO default_venue_id FROM "Venue" ORDER BY id LIMIT 1;

    -- Only update if we found a venue
    IF default_venue_id IS NOT NULL THEN
        -- Update existing ShopifyStore records that don't have a venueId
        UPDATE "ShopifyStore"
        SET "venueId" = default_venue_id
        WHERE "venueId" IS NULL;
    END IF;
END $$;

-- Now make venueId required and add foreign key
-- This will only work if all records now have a venueId
ALTER TABLE "ShopifyStore" ALTER COLUMN "venueId" SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE "ShopifyStore" ADD CONSTRAINT "ShopifyStore_venueId_fkey"
    FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add shopifyStores relation to Venue (this is handled by the FK above, no action needed)
