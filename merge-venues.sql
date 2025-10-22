-- Merge Duplicate CICCIO Venues Script
-- This script will consolidate duplicate venues with the same name

BEGIN;

-- Step 1: Show current venues
SELECT 'Current venues:' as status;
SELECT id, name, slug,
       (SELECT COUNT(*) FROM "Order" WHERE "venueId" = v.id) as order_count,
       (SELECT COUNT(*) FROM "Payout" WHERE "venueId" = v.id) as payout_count
FROM "Venue" v
ORDER BY name, id;

-- Step 2: Find the primary venue (the one with most orders)
-- Assuming venue IDs based on typical auto-increment, the one with more orders is likely ID 1
-- We'll keep the venue with the most orders and merge others into it

-- First, let's identify duplicates by name (case-insensitive)
SELECT 'Finding duplicates...' as status;
SELECT LOWER(TRIM(name)) as normalized_name,
       ARRAY_AGG(id ORDER BY (SELECT COUNT(*) FROM "Order" WHERE "venueId" = "Venue".id) DESC) as venue_ids,
       COUNT(*) as duplicate_count
FROM "Venue"
GROUP BY LOWER(TRIM(name))
HAVING COUNT(*) > 1;

-- Step 3: Perform the merge for CICCIO venues
-- We'll update all orders and payouts from duplicate venues to the primary venue

-- Identify primary and duplicate CICCIO venues
WITH ciccio_venues AS (
  SELECT id, name,
         (SELECT COUNT(*) FROM "Order" WHERE "venueId" = v.id) as order_count,
         ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(name)) ORDER BY (SELECT COUNT(*) FROM "Order" WHERE "venueId" = v.id) DESC, id ASC) as rank
  FROM "Venue" v
  WHERE LOWER(TRIM(name)) = 'ciccio'
),
primary_venue AS (
  SELECT id FROM ciccio_venues WHERE rank = 1
),
duplicate_venues AS (
  SELECT id FROM ciccio_venues WHERE rank > 1
)
-- Update orders to point to primary venue
UPDATE "Order"
SET "venueId" = (SELECT id FROM primary_venue)
WHERE "venueId" IN (SELECT id FROM duplicate_venues);

SELECT 'Orders transferred' as status;

-- Update payouts to point to primary venue
WITH ciccio_venues AS (
  SELECT id, name,
         (SELECT COUNT(*) FROM "Order" WHERE "venueId" = v.id) as order_count,
         ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(name)) ORDER BY (SELECT COUNT(*) FROM "Order" WHERE "venueId" = v.id) DESC, id ASC) as rank
  FROM "Venue" v
  WHERE LOWER(TRIM(name)) = 'ciccio'
),
primary_venue AS (
  SELECT id FROM ciccio_venues WHERE rank = 1
),
duplicate_venues AS (
  SELECT id FROM ciccio_venues WHERE rank > 1
)
UPDATE "Payout"
SET "venueId" = (SELECT id FROM primary_venue)
WHERE "venueId" IN (SELECT id FROM duplicate_venues);

SELECT 'Payouts transferred' as status;

-- Update user-venue relationships
-- First, connect users from duplicate venues to primary venue (avoiding duplicates)
WITH ciccio_venues AS (
  SELECT id, name,
         (SELECT COUNT(*) FROM "Order" WHERE "venueId" = v.id) as order_count,
         ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(name)) ORDER BY (SELECT COUNT(*) FROM "Order" WHERE "venueId" = v.id) DESC, id ASC) as rank
  FROM "Venue" v
  WHERE LOWER(TRIM(name)) = 'ciccio'
),
primary_venue AS (
  SELECT id FROM ciccio_venues WHERE rank = 1
),
duplicate_venues AS (
  SELECT id FROM ciccio_venues WHERE rank > 1
)
INSERT INTO "_UserVenues" ("A", "B")
SELECT DISTINCT uv."A", (SELECT id FROM primary_venue)
FROM "_UserVenues" uv
WHERE uv."B" IN (SELECT id FROM duplicate_venues)
  AND NOT EXISTS (
    SELECT 1 FROM "_UserVenues" existing
    WHERE existing."A" = uv."A"
      AND existing."B" = (SELECT id FROM primary_venue)
  );

SELECT 'User associations updated' as status;

-- Remove old user-venue relationships for duplicate venues
WITH ciccio_venues AS (
  SELECT id, name,
         (SELECT COUNT(*) FROM "Order" WHERE "venueId" = v.id) as order_count,
         ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(name)) ORDER BY (SELECT COUNT(*) FROM "Order" WHERE "venueId" = v.id) DESC, id ASC) as rank
  FROM "Venue" v
  WHERE LOWER(TRIM(name)) = 'ciccio'
),
duplicate_venues AS (
  SELECT id FROM ciccio_venues WHERE rank > 1
)
DELETE FROM "_UserVenues"
WHERE "B" IN (SELECT id FROM duplicate_venues);

SELECT 'Old user associations removed' as status;

-- Delete duplicate venues
WITH ciccio_venues AS (
  SELECT id, name,
         (SELECT COUNT(*) FROM "Order" WHERE "venueId" = v.id) as order_count,
         ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(name)) ORDER BY (SELECT COUNT(*) FROM "Order" WHERE "venueId" = v.id) DESC, id ASC) as rank
  FROM "Venue" v
  WHERE LOWER(TRIM(name)) = 'ciccio'
),
duplicate_venues AS (
  SELECT id FROM ciccio_venues WHERE rank > 1
)
DELETE FROM "Venue"
WHERE id IN (SELECT id FROM duplicate_venues);

SELECT 'Duplicate venues deleted' as status;

-- Step 4: Show final state
SELECT 'Final venues:' as status;
SELECT id, name, slug,
       (SELECT COUNT(*) FROM "Order" WHERE "venueId" = v.id) as order_count,
       (SELECT COUNT(*) FROM "Payout" WHERE "venueId" = v.id) as payout_count,
       (SELECT COUNT(*) FROM "_UserVenues" WHERE "B" = v.id) as user_count
FROM "Venue" v
ORDER BY name, id;

COMMIT;

SELECT 'Merge complete!' as status;
