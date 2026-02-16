import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getExchangeRateWithInfo } from "@/lib/exchange-rate";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") || "USD";
  const to = searchParams.get("to") || "EGP";

  try {
    const { rate, cached, fetchedAt } = await getExchangeRateWithInfo(from, to);

    return NextResponse.json({
      rate,
      cached,
      fetchedAt: fetchedAt?.toISOString() || null,
      from,
      to
    });
  } catch (error) {
    console.error("Failed to get exchange rate:", error);
    return NextResponse.json(
      { message: "Failed to fetch exchange rate" },
      { status: 500 }
    );
  }
}
