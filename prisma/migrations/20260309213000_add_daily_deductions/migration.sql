CREATE TABLE "DailyDeduction" (
    "id" SERIAL NOT NULL,
    "venueId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyDeduction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DailyDeduction_venueId_date_key" ON "DailyDeduction"("venueId", "date");
CREATE INDEX "DailyDeduction_venueId_idx" ON "DailyDeduction"("venueId");

ALTER TABLE "DailyDeduction"
ADD CONSTRAINT "DailyDeduction_venueId_fkey"
FOREIGN KEY ("venueId") REFERENCES "Venue"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
