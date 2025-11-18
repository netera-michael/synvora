import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getExchangeRateWithInfo } from "@/lib/exchange-rate";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { rate, cached, fetchedAt } = await getExchangeRateWithInfo();

    return NextResponse.json({
      rate,
      cached,
      fetchedAt: fetchedAt?.toISOString() || null,
      from: "USD",
      to: "EGP"
    });
  } catch (error) {
    console.error("Failed to get exchange rate:", error);
    return NextResponse.json(
      { message: "Failed to fetch exchange rate" },
      { status: 500 }
    );
  }
}
