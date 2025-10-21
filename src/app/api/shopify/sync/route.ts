import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { fetchShopifyOrders, transformShopifyOrders } from "@/lib/shopify";
import { ensureVenue } from "@/lib/order-utils";

const schema = z.object({
  storeDomain: z.string().min(5),
  accessToken: z.string().min(10),
  sinceId: z.string().optional()
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { storeDomain, accessToken, sinceId } = parsed.data;

  try {
    const store = await prisma.shopifyStore.upsert({
      where: { storeDomain },
      update: { accessToken },
      create: {
        storeDomain,
        accessToken,
        ownerId: Number(session.user.id)
      }
    });

    const shopifyOrders = await fetchShopifyOrders({ storeDomain, accessToken, sinceId });
    const transformed = transformShopifyOrders(shopifyOrders);

    const userVenueIds = session.user.venueIds ?? [];
    let defaultVenueId = userVenueIds[0];
    if (!defaultVenueId) {
      const venueRecord = await ensureVenue("CICCIO");
      defaultVenueId = venueRecord.id;
    }
    if (!defaultVenueId) {
      throw new Error("Unable to resolve a venue for Shopify orders");
    }

    let imported = 0;
    let updatedCount = 0;

    for (const order of transformed) {
      if (!order.externalId) {
        continue;
      }

      const existing = await prisma.order.findUnique({
        where: { externalId: order.externalId }
      });

      if (existing) {
        await prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: existing.id },
            data: {
              orderNumber: order.orderNumber,
              customerName: order.customerName,
              status: order.status,
              financialStatus: order.financialStatus,
              fulfillmentStatus: order.fulfillmentStatus,
              totalAmount: order.totalAmount,
              currency: order.currency,
              processedAt: order.processedAt,
              shippingCity: order.shippingCity,
              shippingCountry: order.shippingCountry,
              tags: order.tags.join(","),
              notes: order.notes,
              shopifyStoreId: store.id,
              source: "shopify",
              venueId: existing.venueId ?? defaultVenueId
            }
          });
          await tx.orderLineItem.deleteMany({ where: { orderId: existing.id } });
          if (order.lineItems.length) {
            await tx.orderLineItem.createMany({
              data: order.lineItems.map((item) => ({
                orderId: existing.id,
                productName: item.productName,
                quantity: item.quantity,
                sku: item.sku,
                price: item.price,
                total: item.total
              }))
            });
          }
        });
        updatedCount += 1;
      } else {
        await prisma.order.create({
          data: {
            externalId: order.externalId,
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            status: order.status,
            financialStatus: order.financialStatus,
            fulfillmentStatus: order.fulfillmentStatus,
            totalAmount: order.totalAmount,
            currency: order.currency,
            processedAt: order.processedAt,
            shippingCity: order.shippingCity,
            shippingCountry: order.shippingCountry,
            tags: order.tags.join(","),
            notes: order.notes,
            createdById: Number(session.user.id),
            shopifyStoreId: store.id,
            source: "shopify",
            venueId: defaultVenueId,
            lineItems: {
              create: order.lineItems.map((item) => ({
                productName: item.productName,
                quantity: item.quantity,
                sku: item.sku,
                price: item.price,
                total: item.total
              }))
            }
          }
        });
        imported += 1;
      }
    }

    return NextResponse.json({
      imported,
      updated: updatedCount,
      totalProcessed: transformed.length
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to sync Shopify orders";
    return NextResponse.json({ message }, { status: 500 });
  }
}
