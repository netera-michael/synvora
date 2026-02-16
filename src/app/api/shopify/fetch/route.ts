import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { decrypt } from "@/lib/encryption";
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
      accessToken: decrypt(store.accessToken),
      createdAtMin: startDate,
      createdAtMax: endDate
    });

    // Optimization: Filter out existing orders BEFORE transformation
    // This avoids expensive calculations for orders that won't be imported anyway
    const externalIds = shopifyOrders.map(o => String(o.id));

    // Check which orders already exist in the database
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

    // Filter raw Shopify orders
    const newShopifyOrders = shopifyOrders.filter(o => !existingExternalIds.has(String(o.id)));
    const existingCount = shopifyOrders.length - newShopifyOrders.length;

    // Transform ONLY the new orders
    const transformedNewOrders = await transformShopifyOrders(newShopifyOrders, exchangeRate, store.venueId);

    return NextResponse.json({
      orders: transformedNewOrders,
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
      count: transformedNewOrders.length,
      totalFetched: shopifyOrders.length,
      alreadyImported: existingCount
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch orders from Shopify";
    console.error("Shopify fetch error:", error);
    return NextResponse.json({ message }, { status: 500 });
  }
}
