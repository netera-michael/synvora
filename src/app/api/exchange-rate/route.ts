import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * GET /api/exchange-rate
 * Fetches the current USD to EGP exchange rate from a free API
 * Falls back to 48.5 if the API is unavailable
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    // Using open.er-api.com - a free, no-API-key-required exchange rate service
    const response = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error("Failed to fetch exchange rate");
    }

    const data = await response.json();

    // Extract EGP rate from the response
    const egpRate = data?.rates?.EGP;

    if (typeof egpRate === "number" && egpRate > 0) {
      return NextResponse.json({
        rate: Number(egpRate.toFixed(2)),
        source: "open.er-api.com",
        timestamp: data.time_last_update_utc || new Date().toISOString()
      });
    }

    // If EGP rate is not available, fall back to default
    throw new Error("EGP rate not found in response");
  } catch (error) {
    console.error("Error fetching exchange rate:", error);

    // Return fallback rate
    return NextResponse.json({
      rate: 48.5,
      source: "fallback",
      timestamp: new Date().toISOString(),
      error: "Using fallback rate"
    });
  }
}
