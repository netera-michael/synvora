-- Ensure a default venue exists
INSERT INTO "Venue" ("name", "slug")
VALUES ('CICCIO', 'ciccio')
ON CONFLICT ("slug") DO NOTHING;

-- Assign default venue to payouts missing venue
UPDATE "Payout"
SET "venueId" = v.id
FROM "Venue" v
WHERE "Payout"."venueId" IS NULL
  AND v."slug" = 'ciccio';

ALTER TABLE "Payout"
  ALTER COLUMN "venueId" SET NOT NULL;
