const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSkuConflicts() {
    try {
        const products = await prisma.product.findMany({
            include: {
                venue: true
            }
        });

        console.log(`Total products: ${products.length}`);

        const skuMap = new Map();
        const conflicts = [];

        for (const p of products) {
            if (!p.sku) continue;

            const key = `${p.venueId}:${p.sku}`;
            if (skuMap.has(key)) {
                conflicts.push({
                    sku: p.sku,
                    venue: p.venue.name,
                    existing: skuMap.get(key),
                    current: { id: p.id, name: p.name, shopifyProductId: p.shopifyProductId }
                });
            } else {
                skuMap.set(key, { id: p.id, name: p.name, shopifyProductId: p.shopifyProductId });
            }
        }

        if (conflicts.length > 0) {
            console.log('Found SKU Conflicts:');
            console.table(conflicts.map(c => ({
                SKU: c.sku,
                Venue: c.venue,
                'Existing Product': c.existing.name,
                'Existing Shopify ID': c.existing.shopifyProductId,
                'New Product': c.current.name,
                'New Shopify ID': c.current.shopifyProductId
            })));
        } else {
            console.log('No SKU conflicts found in database.');
        }

    } catch (error) {
        console.error('Error checking SKU conflicts:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkSkuConflicts();
