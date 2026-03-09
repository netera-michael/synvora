import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { calculatePayoutFromOrder } from "@/lib/order-utils";
import { BUSINESS_MONTH_START_DAY } from "@/lib/constants";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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

  // Helper: resolve AED/EGP rate from order (aedEgpRate if set, else exchangeRate if it looks like AED rate ≤20)
  const getAedRate = (o: { aedEgpRate?: number | null; exchangeRate?: number | null }) =>
    o.aedEgpRate ?? (o.exchangeRate && o.exchangeRate <= 20 ? o.exchangeRate : null);

  // --- Last 12 months (for KPI cards + bar chart) ---
  const now = new Date();
  const months: {
    month: string; label: string; orders: number; egpTotal: number;
    aedTotal: number; revenue: number; payout: number;
  }[] = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en-US", { month: "short", year: "2-digit" });

    const bizStart = new Date(Date.UTC(d.getFullYear(), d.getMonth(), BUSINESS_MONTH_START_DAY));
    const bizEnd = new Date(Date.UTC(d.getFullYear(), d.getMonth() + 1, BUSINESS_MONTH_START_DAY - 1, 23, 59, 59, 999));

    const mo = orders.filter((o) => {
      const pd = new Date(o.processedAt);
      return pd >= bizStart && pd <= bizEnd;
    });

    const revenue = mo.reduce((s, o) => s + o.totalAmount, 0);
    const payout = mo.reduce((s, o) => s + calculatePayoutFromOrder(o), 0);
    const egpTotal = mo.reduce((s, o) =>
      typeof o.originalAmount === "number" && o.originalAmount > 0 ? s + o.originalAmount : s, 0);
    const aedTotal = mo.reduce((s, o) => {
      const rate = getAedRate(o);
      if (typeof o.originalAmount === "number" && o.originalAmount > 0 && rate && rate > 0)
        return s + o.originalAmount / rate;
      return s;
    }, 0);

    months.push({ month: key, label, orders: mo.length, egpTotal, aedTotal, revenue, payout });
  }

  // --- All-time totals ---
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((s, o) => s + o.totalAmount, 0);
  const totalPayout = orders.reduce((s, o) => s + calculatePayoutFromOrder(o), 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const allTimeEGP = orders.reduce((s, o) =>
    typeof o.originalAmount === "number" && o.originalAmount > 0 ? s + o.originalAmount : s, 0);
  const allTimeAED = orders.reduce((s, o) => {
    const rate = getAedRate(o);
    if (typeof o.originalAmount === "number" && o.originalAmount > 0 && rate && rate > 0)
      return s + o.originalAmount / rate;
    return s;
  }, 0);

  // --- Payment status breakdown ---
  const breakdown: Record<string, number> = {};
  for (const o of orders) {
    const status = o.financialStatus ?? "Unknown";
    breakdown[status] = (breakdown[status] ?? 0) + 1;
  }

  // --- Month-over-month ---
  const currentMonth = months[11];
  const prevMonth = months[10];
  const momPayoutChange =
    prevMonth.payout > 0 ? ((currentMonth.payout - prevMonth.payout) / prevMonth.payout) * 100 : null;
  const momOrdersChange =
    prevMonth.orders > 0 ? ((currentMonth.orders - prevMonth.orders) / prevMonth.orders) * 100 : null;

  // --- All-time accordion (month → days) for drill-down UI ---
  const allMonthMap = new Map<string, {
    label: string; ordersCount: number; egpTotal: number; aedTotal: number; revenue: number;
    days: Map<string, { label: string; ordersCount: number; egpTotal: number; aedTotal: number; revenue: number }>;
  }>();

  for (const o of orders) {
    const pd = new Date(o.processedAt);
    const yr = pd.getUTCFullYear();
    const mo = pd.getUTCMonth();
    const dy = pd.getUTCDate();
    const monthKey = `${yr}-${String(mo + 1).padStart(2, "0")}`;
    const dateKey = `${yr}-${String(mo + 1).padStart(2, "0")}-${String(dy).padStart(2, "0")}`;

    if (!allMonthMap.has(monthKey)) {
      allMonthMap.set(monthKey, {
        label: `${MONTH_NAMES[mo]} ${yr}`,
        ordersCount: 0, egpTotal: 0, aedTotal: 0, revenue: 0, days: new Map()
      });
    }
    const m = allMonthMap.get(monthKey)!;
    m.ordersCount++;
    m.revenue += o.totalAmount;
    if (typeof o.originalAmount === "number" && o.originalAmount > 0) m.egpTotal += o.originalAmount;
    const rate = getAedRate(o);
    if (typeof o.originalAmount === "number" && o.originalAmount > 0 && rate && rate > 0)
      m.aedTotal += o.originalAmount / rate;

    if (!m.days.has(dateKey)) {
      m.days.set(dateKey, {
        label: `${MONTH_SHORT[mo]} ${dy}`,
        ordersCount: 0, egpTotal: 0, aedTotal: 0, revenue: 0
      });
    }
    const day = m.days.get(dateKey)!;
    day.ordersCount++;
    day.revenue += o.totalAmount;
    if (typeof o.originalAmount === "number" && o.originalAmount > 0) day.egpTotal += o.originalAmount;
    if (typeof o.originalAmount === "number" && o.originalAmount > 0 && rate && rate > 0)
      day.aedTotal += o.originalAmount / rate;
  }

  const allMonths = Array.from(allMonthMap.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, data]) => ({
      month,
      label: data.label,
      ordersCount: data.ordersCount,
      egpTotal: data.egpTotal,
      aedTotal: data.aedTotal,
      revenue: data.revenue,
      days: Array.from(data.days.entries())
        .map(([date, d]) => ({ date, ...d }))
        .sort((a, b) => a.date.localeCompare(b.date))
    }));

  return NextResponse.json({
    months,
    totals: { totalOrders, totalRevenue, totalPayout, avgOrderValue, allTimeEGP, allTimeAED },
    breakdown,
    momPayoutChange,
    momOrdersChange,
    allMonths
  });
}
