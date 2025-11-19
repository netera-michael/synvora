/**
 * Find deleted orders by comparing current database with a time travel branch
 * 
 * Usage:
 * RESTORE_DATABASE_URL="postgresql://time-travel-branch-url" ts-node scripts/find-deleted-orders.ts
 */

import { PrismaClient } from "@prisma/client";

const restoreDbUrl = process.env.RESTORE_DATABASE_URL || process.env.DATABASE_URL;

if (!restoreDbUrl) {
  console.error("Error: RESTORE_DATABASE_URL environment variable is required");
  console.error("This should be the connection string for your Neon time travel branch");
  process.exit(1);
}

// Create Prisma client for restore database (time travel branch)
const restorePrisma = new PrismaClient({
  datasources: {
    db: {
      url: restoreDbUrl
    }
  }
});

// Create Prisma client for production database
const productionPrisma = new PrismaClient();

async function findDeletedOrders() {
  try {
    console.log("\n🔍 Comparing databases to find deleted orders...\n");

    // Get all orders from time travel branch (before deletion)
    const ordersInBackup = await restorePrisma.order.findMany({
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        processedAt: true,
        totalAmount: true,
        venue: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        id: "desc"
      }
    });

    // Get all orders from production (current)
    const ordersInProduction = await productionPrisma.order.findMany({
      select: {
        id: true
      }
    });

    const productionIds = new Set(ordersInProduction.map(o => o.id));
    const deletedOrders = ordersInBackup.filter(o => !productionIds.has(o.id));

    if (deletedOrders.length === 0) {
      console.log("✅ No deleted orders found. All orders from the backup exist in production.\n");
      return;
    }

    console.log(`❌ Found ${deletedOrders.length} deleted order(s):\n`);
    console.log("Order IDs to restore:");
    console.log(deletedOrders.map(o => o.id).join(" "));
    console.log("\nDetails:\n");

    deletedOrders.forEach(order => {
      console.log(`  ID: ${order.id}`);
      console.log(`  Order #: ${order.orderNumber}`);
      console.log(`  Customer: ${order.customerName}`);
      console.log(`  Venue: ${order.venue?.name || "N/A"}`);
      console.log(`  Date: ${order.processedAt.toLocaleDateString()}`);
      console.log(`  Amount: $${order.totalAmount.toFixed(2)}`);
      console.log("");
    });

    console.log("\n📋 To restore these orders, run:");
    console.log(`npm run restore:orders ${deletedOrders.map(o => o.id).join(" ")}`);
    console.log("\nOr:");
    console.log(`RESTORE_DATABASE_URL="${restoreDbUrl}" npm run restore:orders ${deletedOrders.map(o => o.id).join(" ")}`);
    console.log("");

  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  } finally {
    await restorePrisma.$disconnect();
    await productionPrisma.$disconnect();
  }
}

findDeletedOrders();

