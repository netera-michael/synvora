-- AlterTable
ALTER TABLE "Payout" ADD COLUMN     "period" TEXT;

-- AlterTable
ALTER TABLE "Venue" ADD COLUMN     "balanceAdjustment" DOUBLE PRECISION NOT NULL DEFAULT 0;
