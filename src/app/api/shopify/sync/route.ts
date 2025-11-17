import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * @deprecated This endpoint is deprecated. Please use the new workflow:
 * 1. Manage stores at /api/shopify-stores
 * 2. Fetch orders for review at /api/shopify/fetch
 * 3. Import selected orders at /api/shopify/import
 *
 * The new workflow includes:
 * - Store management with venue assignment
 * - Date range filtering
 * - Order review before import
 * - Automatic EGP amount calculation from product prices
 * - Exchange rate auto-fetching
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(
    {
      message: "This endpoint is deprecated. Please use the new Shopify sync workflow.",
      details: {
        storeManagement: "/api/shopify-stores (GET, POST) and /api/shopify-stores/[id] (PATCH, DELETE)",
        fetchOrders: "/api/shopify/fetch (POST) - Preview orders before import",
        importOrders: "/api/shopify/import (POST) - Import selected orders",
        testConnection: "/api/shopify/test-connection (POST) - Test credentials"
      },
      newFeatures: [
        "Store management with venue assignment",
        "Date range filtering for order sync",
        "Order review and selection before import",
        "Automatic EGP amount calculation from product prices",
        "Exchange rate auto-fetching with caching"
      ]
    },
    { status: 410 }
  );
}
