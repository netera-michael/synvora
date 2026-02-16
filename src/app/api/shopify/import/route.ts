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
  orderNumber: z.string(),
  customerName: z.string(),
  status: z.string(),
  financialStatus: z.string().nullable(),
  fulfillmentStatus: z.string().nullable(),
  totalAmount: z.number(),
  originalAmount: z.number().nullable(),
  exchangeRate: z.number(),
  currency: z.string(),
  processedAt: z.string(), // ISO date string
  shippingCity: z.string().nullable(),
  shippingCountry: z.string().nullable(),
  tags: z.array(z.string()),
  notes: z.string().nullable(),
  lineItems: z.array(lineItemSchema)
});

const schema = z.object({
  storeId: z.number(),
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
    return NextResponse.json(
      { message: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { storeId, orders } = parsed.data;

  try {
    // Fetch the Shopify store with venue information
    const store = await prisma.shopifyStore.findUnique({
      where: { id: storeId },
      include: {
        venue: true
      }
    });

    if (!store) {
      return NextResponse.json({ message: "Store not found" }, { status: 404 });
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
      // Efficiently find the current max order number
      // We assume the most recently created order has the highest number
      const lastOrder = await prisma.order.findFirst({
        orderBy: { id: 'desc' },
        select: { orderNumber: true }
      });

      let maxOrderNum = 1000;
      if (lastOrder?.orderNumber) {
        const num = extractOrderNumber(lastOrder.orderNumber);
        if (num) maxOrderNum = num;
      }

      // Sort new orders by processedAt ASC (oldest first) to assign numbers chronologically
      inserts.sort((a, b) => new Date(a.processedAt).getTime() - new Date(b.processedAt).getTime());

      // Assign numbers relative to max
      // Modifying the order objects in place with a temporary property
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
              shopifyStoreId: store.id,
              source: "shopify",
              venueId: store.venueId
            }
          });

          // Delete old line items and create new ones
          await tx.orderLineItem.deleteMany({
            where: { orderId: order.dbId }
          });

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
            shopifyStoreId: store.id,
            source: "shopify",
            venueId: store.venueId,
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
