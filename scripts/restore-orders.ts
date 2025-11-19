/**
 * Restore deleted orders from Neon time travel branch
 * 
 * Usage:
 * 1. Create a time travel branch in Neon console before the deletion
 * 2. Get the connection string for that branch
 * 3. Set RESTORE_DATABASE_URL environment variable
 * 4. Run: ts-node scripts/restore-orders.ts [orderId1] [orderId2] ...
 * 
 * Example:
 * RESTORE_DATABASE_URL="postgresql://..." ts-node scripts/restore-orders.ts 5991 5992 5993
 */

import { PrismaClient } from "@prisma/client";

const restoreDbUrl = process.env.RESTORE_DATABASE_URL || process.env.DATABASE_URL;
const orderIds = process.argv.slice(2).map(id => parseInt(id, 10)).filter(id => !isNaN(id));

if (!restoreDbUrl) {
  console.error("Error: RESTORE_DATABASE_URL environment variable is required");
  console.error("This should be the connection string for your Neon time travel branch");
  process.exit(1);
}

if (orderIds.length === 0) {
  console.error("Error: Please provide order IDs to restore");
  console.error("Usage: ts-node scripts/restore-orders.ts [orderId1] [orderId2] ...");
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

async function restoreOrders() {
  try {
    console.log(`\n🔍 Fetching orders from restore point...`);
    console.log(`Order IDs to restore: ${orderIds.join(", ")}\n`);

    // Fetch orders from time travel branch
    const ordersToRestore = await restorePrisma.order.findMany({
      where: {
        id: {
          in: orderIds
        }
      },
      include: {
        lineItems: true,
        venue: true
      }
    });

    if (ordersToRestore.length === 0) {
      console.error("❌ No orders found in restore point with those IDs");
      console.error("Make sure:");
      console.error("1. The time travel branch is set to BEFORE the deletion");
      console.error("2. The order IDs are correct");
      process.exit(1);
    }

    console.log(`✅ Found ${ordersToRestore.length} order(s) to restore:\n`);

    // Check if orders already exist in production
    const existingOrders = await productionPrisma.order.findMany({
      where: {
        id: {
          in: orderIds
        }
      },
      select: {
        id: true,
        orderNumber: true
      }
    });

    const existingIds = new Set(existingOrders.map(o => o.id));
    const toRestore = ordersToRestore.filter(o => !existingIds.has(o.id));
    const alreadyExist = ordersToRestore.filter(o => existingIds.has(o.id));

    if (alreadyExist.length > 0) {
      console.log(`⚠️  ${alreadyExist.length} order(s) already exist in production:`);
      alreadyExist.forEach(o => {
        console.log(`   - Order #${o.orderNumber} (ID: ${o.id})`);
      });
      console.log();
    }

    if (toRestore.length === 0) {
      console.log("✅ All orders already exist in production. Nothing to restore.");
      return;
    }

    console.log(`📦 Restoring ${toRestore.length} order(s):\n`);

    // Restore each order
    for (const order of toRestore) {
      console.log(`   Restoring Order #${order.orderNumber} (ID: ${order.id})...`);

      try {
        await productionPrisma.$transaction(async (tx) => {
          // Check if venue exists, create if not
          let venue = await tx.venue.findUnique({
            where: { id: order.venueId }
          });

          if (!venue && order.venue) {
            venue = await tx.venue.upsert({
              where: { slug: order.venue.slug },
              update: { name: order.venue.name },
              create: {
                name: order.venue.name,
                slug: order.venue.slug
              }
            });
          }

          // Restore the order
          const restoredOrder = await tx.order.create({
            data: {
              id: order.id, // Keep original ID
              externalId: order.externalId,
              orderNumber: order.orderNumber,
              shopifyOrderNumber: order.shopifyOrderNumber,
              customerName: order.customerName,
              status: order.status,
              financialStatus: order.financialStatus,
              fulfillmentStatus: order.fulfillmentStatus,
              totalAmount: order.totalAmount,
              currency: order.currency,
              processedAt: order.processedAt,
              closedAt: order.closedAt,
              shippingCity: order.shippingCity,
              shippingCountry: order.shippingCountry,
              tags: order.tags,
              originalAmount: order.originalAmount,
              exchangeRate: order.exchangeRate,
              notes: order.notes,
              source: order.source,
              createdAt: order.createdAt,
              updatedAt: order.updatedAt,
              createdById: order.createdById,
              shopifyStoreId: order.shopifyStoreId,
              venueId: venue?.id || order.venueId,
              lineItems: {
                create: order.lineItems.map(item => ({
                  productName: item.productName,
                  quantity: item.quantity,
                  sku: item.sku,
                  shopifyProductId: item.shopifyProductId,
                  price: item.price,
                  total: item.total
                }))
              }
            }
          });

          console.log(`      ✅ Restored successfully`);
        });
      } catch (error: any) {
        console.error(`      ❌ Failed to restore: ${error.message}`);
        if (error.code === 'P2002') {
          console.error(`      ⚠️  Order with this ID or externalId already exists`);
        }
      }
    }

    console.log(`\n✅ Restore complete!\n`);
  } catch (error) {
    console.error("\n❌ Error during restore:", error);
    process.exit(1);
  } finally {
    await restorePrisma.$disconnect();
    await productionPrisma.$disconnect();
  }
}

restoreOrders();

