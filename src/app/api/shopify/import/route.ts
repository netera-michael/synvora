import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { generateNextOrderNumber } from "@/lib/order-utils";

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

    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (const order of orders) {
      try {
        const existing = await prisma.order.findUnique({
          where: { externalId: order.externalId }
        });

        if (existing) {
          // Update existing order
          await prisma.$transaction(async (tx) => {
            await tx.order.update({
              where: { id: existing.id },
              data: {
                // Keep existing Synvora orderNumber, update Shopify reference
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
              where: { orderId: existing.id }
            });

            if (order.lineItems.length > 0) {
              await tx.orderLineItem.createMany({
                data: order.lineItems.map((item) => ({
                  orderId: existing.id,
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
          updated += 1;
        } else {
          // Generate next sequential order number atomically
          const orderNumber = await generateNextOrderNumber();

          // Create new order with sequential order number
          await prisma.order.create({
            data: {
              externalId: order.externalId,
              orderNumber,
              shopifyOrderNumber: order.orderNumber, // Store Shopify order number
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

          imported += 1;
        }
      } catch (error) {
        console.error(`Failed to import order ${order.orderNumber}:`, error);
        skipped += 1;
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
