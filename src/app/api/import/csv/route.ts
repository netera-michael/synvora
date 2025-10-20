import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_EXCHANGE_RATE,
  calculateFromOriginalAmount,
  generateNextOrderNumber
} from "@/lib/order-utils";

const importSchema = z.object({
  orders: z
    .array(
      z.object({
        processedAt: z.union([z.string(), z.date()]),
        originalAmount: z.number().nonnegative(),
        exchangeRate: z.number().positive().optional()
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

  let imported = 0;

  for (const item of parsed.data.orders) {
    const processedAt =
      item.processedAt instanceof Date ? item.processedAt : new Date(item.processedAt);

    if (Number.isNaN(processedAt.getTime())) {
      continue;
    }

    const originalAmount = Number(item.originalAmount);
    const exchangeRate =
      typeof item.exchangeRate === "number" && item.exchangeRate > 0
        ? item.exchangeRate
        : DEFAULT_EXCHANGE_RATE;

    const { totalAmount } = calculateFromOriginalAmount(originalAmount, exchangeRate);
    const orderNumber = await generateNextOrderNumber();

    await prisma.order.create({
      data: {
        orderNumber,
        customerName: "CSV Import",
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
