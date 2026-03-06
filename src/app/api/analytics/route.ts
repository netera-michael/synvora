import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { calculatePayoutFromOrder } from "@/lib/order-utils";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const isAdmin = session.user.role === "ADMIN";
  const accessibleVenueIds = (session.user.venueIds ?? []).map(Number).filter((n) => !Number.isNaN(n));

  let venueIds: number[];
  if (isAdmin) {
    const all = await prisma.venue.findMany({ select: { id: true } });
    venueIds = all.map((v) => v.id);
  } else {
    if (!accessibleVenueIds.length) return NextResponse.json({ months: [], totals: {}, breakdown: {} });
    venueIds = accessibleVenueIds;
  }

  // All orders for scoped venues
  const orders = await prisma.order.findMany({
    where: { venueId: { in: venueIds } },
    select: {
      id: true,
      processedAt: true,
      totalAmount: true,
      originalAmount: true,
      exchangeRate: true,
      aedEgpRate: true,
      financialStatus: true,
      currency: true,
      orderNumber: true
    },
    orderBy: { processedAt: "asc" }
  });

  // Build monthly aggregates for last 12 months
  const now = new Date();
  const months: { month: string; label: string; orders: number; revenue: number; payout: number; aedTotal: number }[] = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
    const monthOrders = orders.filter((o) => {
      const pd = new Date(o.processedAt);
      return pd.getFullYear() === d.getFullYear() && pd.getMonth() === d.getMonth();
    });
    const revenue = monthOrders.reduce((s, o) => s + o.totalAmount, 0);
    const payout = monthOrders.reduce((s, o) => s + calculatePayoutFromOrder(o), 0);
    const aedTotal = monthOrders.reduce((s, o) => {
      if (typeof o.originalAmount === "number" && o.originalAmount > 0 &&
          typeof o.aedEgpRate === "number" && o.aedEgpRate > 0) {
        return s + o.originalAmount / o.aedEgpRate;
      }
      return s;
    }, 0);
    months.push({ month: key, label, orders: monthOrders.length, revenue, payout, aedTotal });
  }

  // Totals
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((s, o) => s + o.totalAmount, 0);
  const totalPayout = orders.reduce((s, o) => s + calculatePayoutFromOrder(o), 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Payment status breakdown
  const breakdown: Record<string, number> = {};
  for (const o of orders) {
    const status = o.financialStatus ?? "Unknown";
    breakdown[status] = (breakdown[status] ?? 0) + 1;
  }

  // Month-over-month change (current vs previous)
  const currentMonth = months[11];
  const prevMonth = months[10];
  const momPayoutChange =
    prevMonth.payout > 0 ? ((currentMonth.payout - prevMonth.payout) / prevMonth.payout) * 100 : null;
  const momOrdersChange =
    prevMonth.orders > 0 ? ((currentMonth.orders - prevMonth.orders) / prevMonth.orders) * 100 : null;

  return NextResponse.json({
    months,
    totals: { totalOrders, totalRevenue, totalPayout, avgOrderValue },
    breakdown,
    momPayoutChange,
    momOrdersChange
  });
}
