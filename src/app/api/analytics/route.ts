import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const whereClause =
    session.user.role === "ADMIN"
      ? {}
      : { venue: { users: { some: { id: Number(session.user.id) } } } };

  const orders = await prisma.order.findMany({
    where: whereClause,
    select: {
      processedAt: true,
      totalAmount: true,
      originalAmount: true
    },
    orderBy: { processedAt: "desc" }
  });

  // Group by UTC month → UTC day
  const monthMap = new Map<
    string,
    {
      label: string;
      ordersCount: number;
      totalUSD: number;
      totalEGP: number;
      days: Map<string, { label: string; ordersCount: number; totalUSD: number; totalEGP: number }>;
    }
  >();

  for (const order of orders) {
    const d = new Date(order.processedAt);
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth();
    const day = d.getUTCDate();

    const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
    const dayKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const monthLabel = `${MONTH_NAMES[month]} ${year}`;
    const dayLabel = `${MONTH_SHORT[month]} ${day}`;

    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, {
        label: monthLabel,
        ordersCount: 0,
        totalUSD: 0,
        totalEGP: 0,
        days: new Map()
      });
    }

    const monthData = monthMap.get(monthKey)!;
    monthData.ordersCount++;
    monthData.totalUSD += order.totalAmount;
    monthData.totalEGP += order.originalAmount ?? 0;

    if (!monthData.days.has(dayKey)) {
      monthData.days.set(dayKey, { label: dayLabel, ordersCount: 0, totalUSD: 0, totalEGP: 0 });
    }

    const dayData = monthData.days.get(dayKey)!;
    dayData.ordersCount++;
    dayData.totalUSD += order.totalAmount;
    dayData.totalEGP += order.originalAmount ?? 0;
  }

  const result = Array.from(monthMap.entries()).map(([month, data]) => ({
    month,
    label: data.label,
    ordersCount: data.ordersCount,
    totalUSD: data.totalUSD,
    totalEGP: data.totalEGP,
    totalAED: data.totalUSD * 3.67,
    days: Array.from(data.days.entries())
      .map(([date, dayData]) => ({
        date,
        label: dayData.label,
        ordersCount: dayData.ordersCount,
        totalUSD: dayData.totalUSD,
        totalEGP: dayData.totalEGP,
        totalAED: dayData.totalUSD * 3.67
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }));

  return NextResponse.json(result);
}
