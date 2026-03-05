-- Add aedEgpRate to Order
ALTER TABLE "Order" ADD COLUMN "aedEgpRate" DOUBLE PRECISION;

-- Create DailyRate table
CREATE TABLE "DailyRate" (
    "id" SERIAL NOT NULL,
    "venueId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "aedEgpRate" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyRate_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "DailyRate_venueId_date_key" ON "DailyRate"("venueId", "date");
CREATE INDEX "DailyRate_venueId_idx" ON "DailyRate"("venueId");

-- Foreign key
ALTER TABLE "DailyRate" ADD CONSTRAINT "DailyRate_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
