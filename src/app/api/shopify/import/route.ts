import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { generateNextOrderNumber, extractOrderNumber } from "@/lib/order-utils";

const lineItemSchema = z.object({
  productName: z.string(),
  quantity: z.number(),
  sku: z.string().optional(),
  shopifyProductId: z.string().optional(),
  price: z.number(),
  total: z.number()
});

const orderSchema = z.object({
  externalId: z.string(),
  shopifyStoreId: z.number().optional(),
  orderNumber: z.string(),
  customerName: z.string(),
  status: z.string(),
  financialStatus: z.string().nullable(),
  fulfillmentStatus: z.string().nullable(),
  totalAmount: z.number(),
  originalAmount: z.number().nullable(),
  exchangeRate: z.number(),
  currency: z.string(),
  processedAt: z.union([z.string(), z.date()]), // ISO date string or Date object
  shippingCity: z.string().nullable(),
  shippingCountry: z.string().nullable(),
  tags: z.array(z.string()),
  notes: z.string().nullable(),
  lineItems: z.array(lineItemSchema)
});

const schema = z.object({
  storeId: z.number().nullable().optional(),
  orders: z.array(orderSchema)
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const payload = await request.json();
  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    console.error("Payload validation failed:", JSON.stringify(parsed.error.flatten(), null, 2));
    return NextResponse.json(
      { message: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { storeId, orders } = parsed.data;

  try {
    // Collect all unique store IDs
    const uniqueStoreIds = new Set<number>();
    if (storeId) uniqueStoreIds.add(storeId);
    orders.forEach(o => {
      if (o.shopifyStoreId) uniqueStoreIds.add(o.shopifyStoreId);
    });

    // Fetch all needed stores
    const stores = await prisma.shopifyStore.findMany({
      where: { id: { in: Array.from(uniqueStoreIds) } },
      include: { venue: true }
    });
    const storeMap = new Map(stores.map(s => [s.id, s]));

    if (uniqueStoreIds.size > 0 && stores.length === 0) {
      return NextResponse.json({ message: "Store(s) not found" }, { status: 404 });
    }

    // Bulk check existing orders
    const externalIds = orders.map(o => o.externalId);
    const existingOrders = await prisma.order.findMany({
      where: { externalId: { in: externalIds } },
      select: { id: true, externalId: true }
    });

    const existingMap = new Map(existingOrders.map(o => [o.externalId, o]));

    const updates: (typeof orders[0] & { dbId: number })[] = [];
    const inserts: typeof orders = [];

    for (const order of orders) {
      if (existingMap.has(order.externalId)) {
        updates.push({ ...order, dbId: existingMap.get(order.externalId)!.id });
      } else {
        inserts.push(order);
      }
    }

    // Assign order numbers to new orders
    if (inserts.length > 0) {
      const lastOrder = await prisma.order.findFirst({
        orderBy: { id: 'desc' },
        select: { orderNumber: true }
      });

      let maxOrderNum = 1000;
      if (lastOrder?.orderNumber) {
        const num = extractOrderNumber(lastOrder.orderNumber);
        if (num) maxOrderNum = num;
      }

      inserts.sort((a, b) => new Date(a.processedAt).getTime() - new Date(b.processedAt).getTime());
      inserts.forEach((order, index) => {
        (order as any)._generatedOrderNumber = `#${maxOrderNum + index + 1}`;
      });
    }

    let imported = 0;
    let updated = 0;
    let skipped = 0;

    // Process Updates
    for (const order of updates) {
      try {
        const currentStoreId = order.shopifyStoreId || storeId;
        const currentStore = currentStoreId ? storeMap.get(currentStoreId) : null;

        if (!currentStore) {
          console.error(`Store not found for order ${order.orderNumber}`);
          skipped++;
          continue;
        }

        await prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: order.dbId },
            data: {
              shopifyOrderNumber: order.orderNumber,
              customerName: order.customerName,
              status: order.status,
              financialStatus: order.financialStatus,
              fulfillmentStatus: order.fulfillmentStatus,
              totalAmount: order.totalAmount,
              originalAmount: order.originalAmount,
              exchangeRate: order.exchangeRate,
              currency: order.currency,
              processedAt: new Date(order.processedAt),
              shippingCity: order.shippingCity,
              shippingCountry: order.shippingCountry,
              tags: order.tags.join(","),
              notes: order.notes,
              shopifyStoreId: currentStore.id,
              source: "shopify",
              venueId: currentStore.venueId
            }
          });

          await tx.orderLineItem.deleteMany({ where: { orderId: order.dbId } });

          if (order.lineItems.length > 0) {
            await tx.orderLineItem.createMany({
              data: order.lineItems.map((item) => ({
                orderId: order.dbId,
                productName: item.productName,
                quantity: item.quantity,
                sku: item.sku,
                shopifyProductId: item.shopifyProductId,
                price: item.price,
                total: item.total
              }))
            });
          }
        });
        updated++;
      } catch (error) {
        console.error(`Failed to update order ${order.orderNumber}:`, error);
        skipped++;
      }
    }

    // Process Inserts
    for (const order of inserts) {
      try {
        const currentStoreId = order.shopifyStoreId || storeId;
        const currentStore = currentStoreId ? storeMap.get(currentStoreId) : null;

        if (!currentStore) {
          console.error(`Store not found for order ${order.orderNumber}`);
          skipped++;
          continue;
        }

        const generatedNum = (order as any)._generatedOrderNumber;

        await prisma.order.create({
          data: {
            externalId: order.externalId,
            orderNumber: generatedNum,
            shopifyOrderNumber: order.orderNumber,
            customerName: order.customerName,
            status: order.status,
            financialStatus: order.financialStatus,
            fulfillmentStatus: order.fulfillmentStatus,
            totalAmount: order.totalAmount,
            originalAmount: order.originalAmount,
            exchangeRate: order.exchangeRate,
            currency: order.currency,
            processedAt: new Date(order.processedAt),
            shippingCity: order.shippingCity,
            shippingCountry: order.shippingCountry,
            tags: order.tags.join(","),
            notes: order.notes,
            createdById: Number(session.user.id),
            shopifyStoreId: currentStore.id,
            source: "shopify",
            venueId: currentStore.venueId,
            lineItems: {
              create: order.lineItems.map((item) => ({
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
        imported++;
      } catch (error) {
        console.error(`Failed to import order ${order.orderNumber}:`, error);
        skipped++;
      }
    }

    return NextResponse.json({
      imported,
      updated,
      skipped,
      totalProcessed: orders.length
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to import orders";
    console.error("Import error:", error);
    return NextResponse.json({ message }, { status: 500 });
  }
}
