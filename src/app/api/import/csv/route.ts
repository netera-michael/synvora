import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_EXCHANGE_RATE,
  calculateFromOriginalAmount,
  ensureVenue,
  generateNextOrderNumber
} from "@/lib/order-utils";

const importSchema = z.object({
  customerName: z.string().optional(),
  exchangeRate: z.number().positive().optional(),
  venue: z.string().optional(),
  orders: z
    .array(
      z.object({
        processedAt: z.union([z.string(), z.date()]),
        originalAmount: z.number().nonnegative()
      })
    )
    .min(1)
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = importSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const customerName = parsed.data.customerName?.trim() || "CSV Import";
  const venueName = parsed.data.venue?.trim() || "CICCIO";
  const venueRecord = await ensureVenue(venueName);
  const batchExchangeRate =
    typeof parsed.data.exchangeRate === "number" && parsed.data.exchangeRate > 0
      ? parsed.data.exchangeRate
      : DEFAULT_EXCHANGE_RATE;

  let imported = 0;

  for (const item of parsed.data.orders) {
    const processedAt =
      item.processedAt instanceof Date ? item.processedAt : new Date(item.processedAt);

    if (Number.isNaN(processedAt.getTime())) {
      continue;
    }

    const originalAmount = Number(item.originalAmount);
    const exchangeRate = batchExchangeRate;

    const { totalAmount } = calculateFromOriginalAmount(originalAmount, exchangeRate);
    const orderNumber = await generateNextOrderNumber();

    await prisma.order.create({
      data: {
        orderNumber,
        customerName,
        venueId: venueRecord.id,
        status: "Open",
        financialStatus: "Paid",
        totalAmount,
        currency: "USD",
        processedAt,
        originalAmount,
        exchangeRate,
        notes: "Imported via CSV",
        createdById: Number(session.user.id),
        tags: "",
        lineItems: {
          create: []
        }
      }
    });

    imported += 1;
  }

  return NextResponse.json({ imported });
}
