/*
  Warnings:

  - A unique constraint covering the columns `[shopifyStoreId,externalId]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Payout" DROP CONSTRAINT "Payout_venueId_fkey";

-- DropIndex
DROP INDEX "Payout_processedAt_idx";

-- DropIndex
DROP INDEX "Payout_status_idx";

-- AlterTable
ALTER TABLE "Payout" ALTER COLUMN "processedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Venue" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ShopifyImportQueue" (
    "id" SERIAL NOT NULL,
    "shopifyOrderId" TEXT NOT NULL,
    "storeDomain" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "financialStatus" TEXT,
    "orderData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopifyImportQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopifyImportQueue_shopifyOrderId_key" ON "ShopifyImportQueue"("shopifyOrderId");

-- CreateIndex
CREATE INDEX "ShopifyImportQueue_storeDomain_idx" ON "ShopifyImportQueue"("storeDomain");

-- CreateIndex
CREATE INDEX "Order_processedAt_idx" ON "Order"("processedAt");

-- CreateIndex
CREATE INDEX "Order_venueId_idx" ON "Order"("venueId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_shopifyStoreId_externalId_key" ON "Order"("shopifyStoreId", "externalId");

-- CreateIndex
CREATE INDEX "OrderLineItem_orderId_idx" ON "OrderLineItem"("orderId");

-- CreateIndex
CREATE INDEX "Product_venueId_idx" ON "Product"("venueId");

-- CreateIndex
CREATE INDEX "ShopifyStore_venueId_idx" ON "ShopifyStore"("venueId");

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
