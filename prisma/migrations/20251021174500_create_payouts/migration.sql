CREATE TABLE "Payout" (
    "id" SERIAL PRIMARY KEY,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'Posted',
    "description" TEXT NOT NULL DEFAULT 'Payout',
    "account" TEXT NOT NULL DEFAULT 'Payouts',
    "processedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "notes" TEXT,
    "venueId" INTEGER,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE "Payout"
  ADD CONSTRAINT "Payout_venueId_fkey"
  FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Payout"
  ADD CONSTRAINT "Payout_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Payout_processedAt_idx" ON "Payout" ("processedAt" DESC);
CREATE INDEX "Payout_status_idx" ON "Payout" ("status");
