import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { MercuryClient } from "@/lib/mercury";

const schema = z.object({
  accountId: z.string(),
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

  const { accountId, startDate, endDate } = parsed.data;

  try {
    // Get Mercury settings
    const settings = await prisma.mercurySettings.findFirst();
    if (!settings || !settings.apiKey) {
      return NextResponse.json(
        { message: "Mercury API key not configured" },
        { status: 400 }
      );
    }

    const client = new MercuryClient(settings.apiKey);

    // Fetch transactions from Mercury
    const transactions = await client.getTransactions({
      accountId,
      startDate,
      endDate
    });

    // Filter to only credit transactions (incoming money)
    const creditTransactions = transactions.filter(
      (t) => t.direction === "credit"
    );

    // Check which transactions already exist as payouts
    const transactionIds = creditTransactions.map((t) => t.id);
    const existingPayouts = await prisma.payout.findMany({
      where: {
        mercuryTransactionId: {
          in: transactionIds
        }
      },
      select: {
        mercuryTransactionId: true
      }
    });

    const existingTransactionIds = new Set(
      existingPayouts
        .map((p) => p.mercuryTransactionId)
        .filter((id): id is string => id !== null)
    );

    // Filter out already imported transactions
    const newTransactions = creditTransactions.filter(
      (t) => !existingTransactionIds.has(t.id)
    );

    return NextResponse.json({
      transactions: newTransactions,
      count: newTransactions.length,
      totalFetched: creditTransactions.length,
      alreadyImported: creditTransactions.length - newTransactions.length
    });
  } catch (error: unknown) {
    console.error("Failed to fetch Mercury transactions:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch transactions";
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}

