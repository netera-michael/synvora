import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const schema = z.object({
  transactions: z.array(z.object({
    id: z.string(),
    amount: z.number(),
    direction: z.enum(["credit", "debit"]),
    counterparty: z.object({
      name: z.string()
    }).optional(),
    merchant: z.object({
      name: z.string()
    }).optional(),
    memo: z.string().optional(),
    postedAt: z.string(),
    createdAt: z.string().optional() // Allow createdAt for fallback
  })).min(1),
  venueId: z.number().int().positive()
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { transactions, venueId } = parsed.data;

  try {
    // Verify venue exists
    const venue = await prisma.venue.findUnique({
      where: { id: venueId }
    });

    if (!venue) {
      return NextResponse.json(
        { message: "Venue not found" },
        { status: 404 }
      );
    }

    let imported = 0;
    let skipped = 0;

    for (const transaction of transactions) {
      // Skip if already imported
      const existing = await prisma.payout.findFirst({
        where: {
          mercuryTransactionId: transaction.id
        }
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Only import debit transactions (outgoing money/payouts)
      if (transaction.direction !== "debit") {
        skipped++;
        continue;
      }

      // Resolve counterparty name
      const counterpartyName = transaction.counterparty?.name || transaction.merchant?.name || "Unknown";

      // Create payout from transaction
      await prisma.payout.create({
        data: {
          amount: Math.abs(transaction.amount), // Store as positive value for payout record
          currency: "USD",
          status: "Posted",
          description: transaction.memo || `Mercury: ${counterpartyName}`,
          account: "Mercury",
          processedAt: new Date(transaction.postedAt || transaction.createdAt || new Date().toISOString()),
          notes: transaction.memo || null,
          venueId,
          createdById: Number(session.user.id),
          mercuryTransactionId: transaction.id,
          syncedToMercury: true, // Already synced since it came from Mercury
          syncedAt: new Date()
        }
      });

      imported++;
    }

    return NextResponse.json({
      imported,
      skipped,
      total: transactions.length
    });
  } catch (error: unknown) {
    console.error("Failed to import Mercury transactions:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to import transactions";
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}

