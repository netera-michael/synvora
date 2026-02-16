import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { transformShopifyOrders } from "@/lib/shopify";
import { getCurrentExchangeRate } from "@/lib/exchange-rate";

// Schema for filtering pending orders
const getParamsSchema = z.object({
    amount: z.string().optional(), // Filter by exact total amount
    currency: z.string().optional(),
});

// Schema for approving/importing orders
const approveSchema = z.object({
    orderIds: z.array(z.number()), // database definitions (queues IDs)
    venueId: z.number(), // Target venue for the import
});

// Schema for ignoring/deleting orders
const ignoreSchema = z.object({
    orderIds: z.array(z.number()),
});

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const amount = searchParams.get("amount");
    const currency = searchParams.get("currency");

    try {
        const whereClause: any = {};

        if (amount) {
            whereClause.totalAmount = parseFloat(amount);
        }
        if (currency) {
            whereClause.currency = currency;
        }

        const pendingOrders = await prisma.shopifyImportQueue.findMany({
            where: whereClause,
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ orders: pendingOrders });
    } catch (error) {
        console.error("Error fetching pending orders:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const payload = await request.json();
        const parsed = approveSchema.safeParse(payload);

        if (!parsed.success) {
            return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
        }

        const { orderIds, venueId } = parsed.data;

        // 1. Fetch the queued orders
        const queuedOrders = await prisma.shopifyImportQueue.findMany({
            where: { id: { in: orderIds } },
        });

        if (queuedOrders.length === 0) {
            return NextResponse.json({ message: "No orders found to import" }, { status: 404 });
        }

        // 2. Transform them using existing logic
        // We need to group by store to handle store-specific logic if needed, 
        // but primarily we need the raw shopify objects.
        const exchangeRate = await getCurrentExchangeRate();

        // We also need the store IDs. The queue has storeDomain. 
        // We need to map domain to storeId to link the Order correctly.
        const domains = [...new Set(queuedOrders.map(o => o.storeDomain))];
        const stores = await prisma.shopifyStore.findMany({
            where: { storeDomain: { in: domains } }
        });

        const storeMap = new Map(stores.map(s => [s.storeDomain, s.id]));

        const importResults = [];

        for (const queueItem of queuedOrders) {
            const storeId = storeMap.get(queueItem.storeDomain);
            if (!storeId) {
                console.error(`Store not found for domain: ${queueItem.storeDomain}`);
                continue; // Skip if we can't link to a store
            }

            // Re-use the transformation logic? 
            // The `transformShopifyOrders` takes an array of Shopify objects.
            // queueItem.orderData is the raw shopify object.
            const rawOrder = queueItem.orderData as any;

            // Transform single order
            // Using a simplified inline transformation or adapting the helper
            // Ideally we reuse `transformShopifyOrders` but it handles array.
            const [transformed] = await transformShopifyOrders([rawOrder], exchangeRate, venueId);

            if (transformed) {
                // Create the Order in DB
                const orderData = {
                    ...transformed,
                    tags: Array.isArray(transformed.tags) ? transformed.tags.join(", ") : transformed.tags || "",
                    shopifyStoreId: storeId,
                    venueId: venueId,
                };

                const { lineItems, ...rest } = orderData;

                const createdOrder = await prisma.order.create({
                    data: {
                        ...rest,
                        lineItems: {
                            create: lineItems
                        }
                    }
                });
                importResults.push(createdOrder);
            }
        }

        // 3. Delete from Queue after successful import
        await prisma.shopifyImportQueue.deleteMany({
            where: { id: { in: orderIds } }
        });

        return NextResponse.json({
            message: `Successfully imported ${importResults.length} orders`,
            count: importResults.length
        });

    } catch (error) {
        console.error("Error importing pending orders:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const payload = await request.json();
        const parsed = ignoreSchema.safeParse(payload);

        if (!parsed.success) {
            return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
        }

        const { orderIds } = parsed.data;

        await prisma.shopifyImportQueue.deleteMany({
            where: { id: { in: orderIds } }
        });

        return NextResponse.json({ message: "Orders ignored/deleted from queue" });

    } catch (error) {
        console.error("Error deleting pending orders:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
