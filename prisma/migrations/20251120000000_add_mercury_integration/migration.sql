-- AlterTable
ALTER TABLE "Payout" ADD COLUMN "mercuryTransactionId" TEXT,
ADD COLUMN "syncedToMercury" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "syncedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "MercurySettings" (
    "id" SERIAL NOT NULL,
    "apiKey" TEXT NOT NULL,
    "accountId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MercurySettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MercurySettings_id_key" ON "MercurySettings"("id");

