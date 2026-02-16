import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { decrypt } from "@/lib/encryption";
import { fetchShopifyOrders, transformShopifyOrders } from "@/lib/shopify";
import { getCurrentExchangeRate } from "@/lib/exchange-rate";

const schema = z.object({
  storeId: z.number().nullable().optional(),
  venueId: z.number().optional(),
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

  const { storeId, venueId, startDate, endDate } = parsed.data;

  try {
    // Identify which stores to fetch from
    let storesToFetch: any[] = [];
    if (storeId) {
      const store = await prisma.shopifyStore.findUnique({
        where: { id: storeId },
        include: { venue: true }
      });
      if (store) storesToFetch.push(store);
    } else if (venueId) {
      storesToFetch = await prisma.shopifyStore.findMany({
        where: { venueId },
        include: { venue: true }
      });
    }

    if (storesToFetch.length === 0) {
      return NextResponse.json({ message: "No stores found to fetch from" }, { status: 404 });
    }

    // Get current exchange rate
    const exchangeRate = await getCurrentExchangeRate();

    // Fetch from all stores in parallel
    const allResults = await Promise.all(storesToFetch.map(async (store) => {
      try {
        const shopifyOrders = await fetchShopifyOrders({
          storeDomain: store.storeDomain,
          accessToken: decrypt(store.accessToken),
          createdAtMin: startDate,
          createdAtMax: endDate
        });

        // Optimization: Filter out existing orders
        const externalIds = shopifyOrders.map(o => String(o.id));
        const existingOrders = await prisma.order.findMany({
          where: { externalId: { in: externalIds } },
          select: { externalId: true }
        });
        const existingExternalIds = new Set(existingOrders.map(order => order.externalId));

        const newShopifyOrders = shopifyOrders.filter(o => !existingExternalIds.has(String(o.id)));
        const existingCount = shopifyOrders.length - newShopifyOrders.length;

        // Transform ONLY the new orders
        const transformedNewOrders = await transformShopifyOrders(newShopifyOrders, exchangeRate, store.venueId, store.id);

        // Add storeName to each order for display in review
        const ordersWithStoreName = transformedNewOrders.map(order => ({
          ...order,
          storeName: store.nickname || store.storeDomain
        }));

        return {
          orders: ordersWithStoreName,
          totalFetched: shopifyOrders.length,
          alreadyImported: existingCount,
          storeName: store.nickname || store.storeDomain
        };
      } catch (err) {
        console.error(`Failed to fetch orders for ${store.storeDomain}:`, err);
        return {
          orders: [],
          totalFetched: 0,
          alreadyImported: 0,
          error: true,
          storeName: store.nickname || store.storeDomain
        };
      }
    }));

    // Aggregate results
    const aggregatedOrders = allResults.flatMap(r => r.orders);
    const totalFetched = allResults.reduce((sum, r) => sum + r.totalFetched, 0);
    const alreadyImported = allResults.reduce((sum, r) => sum + r.alreadyImported, 0);
    const hasErrors = allResults.some(r => r.error);

    return NextResponse.json({
      orders: aggregatedOrders,
      exchangeRate,
      count: aggregatedOrders.length,
      totalFetched,
      alreadyImported,
      hasErrors,
      store: storeId ? {
        id: storesToFetch[0].id,
        domain: storesToFetch[0].storeDomain,
        nickname: storesToFetch[0].nickname,
        venue: {
          id: storesToFetch[0].venue.id,
          name: storesToFetch[0].venue.name
        }
      } : {
        nickname: "Multiple Stores",
        venue: {
          id: storesToFetch[0].venue.id,
          name: storesToFetch[0].venue.name
        }
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch orders from Shopify";
    console.error("Shopify fetch error:", error);
    return NextResponse.json({ message }, { status: 500 });
  }
}
