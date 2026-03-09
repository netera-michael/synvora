import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { transformShopifyOrders } from "@/lib/shopify";

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

        // Exclude any queue items whose shopifyOrderId already exists in the Order table
        const existingExternalIds = (
            await prisma.order.findMany({
                select: { externalId: true },
                where: { externalId: { not: null } },
            })
        ).map((o) => o.externalId as string);

        const pendingOrders = await prisma.shopifyImportQueue.findMany({
            where: {
                ...whereClause,
                shopifyOrderId: { notIn: existingExternalIds },
            },
            orderBy: { createdAt: "desc" },
        });

        // Clean up any stale queue entries that were already imported (best-effort)
        if (existingExternalIds.length > 0) {
            await prisma.shopifyImportQueue.deleteMany({
                where: { shopifyOrderId: { in: existingExternalIds } },
            }).catch(() => {}); // non-blocking, ignore if it fails
        }

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
        const domains = [...new Set(queuedOrders.map(o => o.storeDomain))];
        const stores = await prisma.shopifyStore.findMany({
            where: { storeDomain: { in: domains } }
        });

        const storeMap = new Map(stores.map(s => [s.storeDomain, s.id]));

        const importResults = [];
        const successfulIds: number[] = [];
        const errors: string[] = [];

        for (const queueItem of queuedOrders) {
            const storeId = storeMap.get(queueItem.storeDomain);
            if (!storeId) {
                const msg = `Store not found for domain: ${queueItem.storeDomain} (Order ID: ${queueItem.id})`;
                console.error(msg);
                errors.push(msg);
                continue;
            }

            try {
                // queueItem.orderData is the raw shopify object.
                const rawOrder = queueItem.orderData as any;

                // Transform single order
                const [transformed] = await transformShopifyOrders([rawOrder], venueId);

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
                    successfulIds.push(queueItem.id);
                } else {
                    errors.push(`Transformation failed for Order ID: ${queueItem.id}`);
                }
            } catch (err: any) {
                console.error(`Error processing order ${queueItem.id}:`, err);
                errors.push(`Error processing Order ID ${queueItem.id}: ${err.message}`);
            }
        }

        // 3. Delete ONLY successfully imported orders from Queue
        if (successfulIds.length > 0) {
            await prisma.shopifyImportQueue.deleteMany({
                where: { id: { in: successfulIds } }
            });
        }

        return NextResponse.json({
            message: `Successfully imported ${importResults.length} orders. ${errors.length > 0 ? `${errors.length} failed.` : ""}`,
            count: importResults.length,
            errors: errors.length > 0 ? errors : undefined
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
