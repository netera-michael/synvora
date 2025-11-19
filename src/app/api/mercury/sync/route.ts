import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { MercuryClient } from "@/lib/mercury";

const syncSchema = z.object({
  payoutIds: z.array(z.number()).optional(),
  syncAll: z.boolean().optional()
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = syncSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Get Mercury settings
  const settings = await prisma.mercurySettings.findFirst();
  if (!settings || !settings.enabled || !settings.apiKey) {
    return NextResponse.json(
      { message: "Mercury integration is not configured or enabled" },
      { status: 400 }
    );
  }

  const client = new MercuryClient(settings.apiKey);
  const accountId = settings.accountId;

  if (!accountId) {
    return NextResponse.json(
      { message: "Mercury account ID is not configured" },
      { status: 400 }
    );
  }

  // Get payouts to sync
  const where: any = {
    syncedToMercury: false
  };

  if (parsed.data.payoutIds && parsed.data.payoutIds.length > 0) {
    where.id = { in: parsed.data.payoutIds };
  }

  const payouts = await prisma.payout.findMany({
    where,
    include: {
      venue: true
    },
    orderBy: {
      processedAt: "desc"
    }
  });

  if (payouts.length === 0) {
    return NextResponse.json({
      message: "No payouts to sync",
      synced: 0,
      failed: 0
    });
  }

  const results = {
    synced: 0,
    failed: 0,
    errors: [] as string[]
  };

  for (const payout of payouts) {
    try {
      // Create transaction in Mercury (payouts are debits)
      const transaction = await client.createTransaction({
        amount: Math.abs(payout.amount),
        direction: "debit",
        accountId,
        counterpartyName: payout.venue?.name || "Unknown Venue",
        memo: `${payout.description}${payout.notes ? ` - ${payout.notes}` : ""}`,
        postedAt: payout.processedAt.toISOString(),
        externalId: `payout-${payout.id}`
      });

      // Update payout with Mercury transaction ID
      await prisma.payout.update({
        where: { id: payout.id },
        data: {
          mercuryTransactionId: transaction.id,
          syncedToMercury: true,
          syncedAt: new Date()
        }
      });

      results.synced++;
    } catch (error) {
      results.failed++;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      results.errors.push(`Payout #${payout.id}: ${errorMessage}`);
      console.error(`Failed to sync payout ${payout.id}:`, error);
    }
  }

  return NextResponse.json({
    message: `Synced ${results.synced} payout(s), ${results.failed} failed`,
    synced: results.synced,
    failed: results.failed,
    errors: results.errors
  });
}

