-- Create Role enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN
        CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');
    END IF;
END $$;

-- Add role column to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" "Role" NOT NULL DEFAULT 'ADMIN';

-- Create Venue table
CREATE TABLE IF NOT EXISTS "Venue" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add venueId column to Order
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "venueId" INTEGER;

-- Populate venues from existing data
INSERT INTO "Venue" ("name", "slug")
SELECT DISTINCT "venue", lower(regexp_replace("venue", '[^a-z0-9]+', '-', 'g'))
FROM "Order"
WHERE "venue" IS NOT NULL
ON CONFLICT ("slug") DO NOTHING;

-- Assign venueId to orders
UPDATE "Order" o
SET "venueId" = v.id
FROM "Venue" v
WHERE lower(regexp_replace(o."venue", '[^a-z0-9]+', '-', 'g')) = v."slug";

-- Ensure venueId is set
ALTER TABLE "Order" ALTER COLUMN "venueId" SET NOT NULL;

-- Add foreign key constraint if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Order_venueId_fkey'
    ) THEN
        ALTER TABLE "Order" ADD CONSTRAINT "Order_venueId_fkey"
          FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- Create join table for user venues if it doesn't exist
CREATE TABLE IF NOT EXISTS "_UserVenues" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "_UserVenues_AB_unique" ON "_UserVenues"("A", "B");
CREATE INDEX IF NOT EXISTS "_UserVenues_B_index" ON "_UserVenues"("B");
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = '_UserVenues_A_fkey'
    ) THEN
        ALTER TABLE "_UserVenues" ADD CONSTRAINT "_UserVenues_A_fkey"
          FOREIGN KEY ("A") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = '_UserVenues_B_fkey'
    ) THEN
        ALTER TABLE "_UserVenues" ADD CONSTRAINT "_UserVenues_B_fkey"
          FOREIGN KEY ("B") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Drop old venue column

ALTER TABLE "Order" DROP COLUMN IF EXISTS "venue";
