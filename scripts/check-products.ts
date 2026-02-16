import { prisma } from "../src/lib/prisma";

async function checkProducts() {
    const storeId = process.argv[2];
    if (!storeId) {
        console.error("Please provide a store ID");
        return;
    }

    const store = await prisma.shopifyStore.findUnique({
        where: { id: parseInt(storeId) },
        include: { venue: true }
    });

    if (!store) {
        console.error("Store not found");
        return;
    }

    console.log(`Store: ${store.storeDomain} (ID: ${store.id})`);
    console.log(`Venue: ${store.venue.name} (ID: ${store.venue.id})`);

    const productCount = await prisma.product.count({
        where: { venueId: store.venue.id, active: true }
    });

    console.log(`Active Products in Venue: ${productCount}`);

    if (productCount === 0) {
        console.warn("⚠️ No active products found! Price calculation will fail.");
    } else {
        console.log("✅ Products found. Pricing should work if SKUs match.");
    }
}

checkProducts()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
