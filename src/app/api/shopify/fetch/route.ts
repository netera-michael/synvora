import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { fetchShopifyOrders, transformShopifyOrders } from "@/lib/shopify";
import { getCurrentExchangeRate } from "@/lib/exchange-rate";

const schema = z.object({
  storeId: z.number(),
  startDate: z.string(), // ISO date string
  endDate: z.string() // ISO date string
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

  const { storeId, startDate, endDate } = parsed.data;

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

    // Get current exchange rate
    const exchangeRate = await getCurrentExchangeRate();

    // Fetch orders from Shopify with date range
    const shopifyOrders = await fetchShopifyOrders({
      storeDomain: store.storeDomain,
      accessToken: store.accessToken,
      createdAtMin: startDate,
      createdAtMax: endDate
    });

    // Transform orders with EGP calculations
    const transformed = await transformShopifyOrders(shopifyOrders, exchangeRate, store.venueId);

    // Check which orders already exist in the database
    const externalIds = transformed.map(order => order.externalId);
    const existingOrders = await prisma.order.findMany({
      where: {
        externalId: {
          in: externalIds
        }
      },
      select: {
        externalId: true
      }
    });

    const existingExternalIds = new Set(existingOrders.map(order => order.externalId));
    
    // Filter out orders that are already imported
    const newOrders = transformed.filter(order => !existingExternalIds.has(order.externalId));
    const existingCount = transformed.length - newOrders.length;

    return NextResponse.json({
      orders: newOrders, // Only return orders that haven't been imported yet
      exchangeRate,
      store: {
        id: store.id,
        domain: store.storeDomain,
        nickname: store.nickname,
        venue: {
          id: store.venue.id,
          name: store.venue.name
        }
      },
      count: newOrders.length,
      totalFetched: transformed.length,
      alreadyImported: existingCount
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch orders from Shopify";
    console.error("Shopify fetch error:", error);
    return NextResponse.json({ message }, { status: 500 });
  }
}
