import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { calculatePayoutFromOrder } from "@/lib/order-utils";
import { BUSINESS_MONTH_START_DAY, CLIENT_COMMISSION_RATE } from "@/lib/constants";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const tzOffsetMinutes = Number(url.searchParams.get("tzOffset") ?? "0");
  const tzOffsetMs = Number.isFinite(tzOffsetMinutes) ? tzOffsetMinutes * 60 * 1000 : 0;

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

  const calculateNetAedPayout = (o: {
    originalAmount?: number | null;
    aedEgpRate?: number | null;
    exchangeRate?: number | null;
  }) => {
    const rate = getAedRate(o);
    if (typeof o.originalAmount === "number" && o.originalAmount > 0 && rate && rate > 0) {
      return o.originalAmount * (1 - CLIENT_COMMISSION_RATE) / rate;
    }
    return 0;
  };

  const getLocalDateParts = (value: Date) => {
    const localDate = new Date(value.getTime() - tzOffsetMs);

    return {
      year: localDate.getUTCFullYear(),
      monthIndex: localDate.getUTCMonth(),
      day: localDate.getUTCDate()
    };
  };

  const getBusinessMonthStart = (year: number, monthIndex: number) =>
    new Date(Date.UTC(year, monthIndex, BUSINESS_MONTH_START_DAY, 0, 0, 0, 0) + tzOffsetMs);

  const getBusinessMonthEnd = (year: number, monthIndex: number) =>
    new Date(Date.UTC(year, monthIndex + 1, BUSINESS_MONTH_START_DAY - 1, 23, 59, 59, 999) + tzOffsetMs);

  const getBusinessMonthMeta = (value: Date) => {
    const { year, monthIndex, day } = getLocalDateParts(value);

    let businessYear = year;
    let businessMonthIndex = monthIndex;

    if (day < BUSINESS_MONTH_START_DAY) {
      businessMonthIndex -= 1;
      if (businessMonthIndex < 0) {
        businessMonthIndex = 11;
        businessYear -= 1;
      }
    }

    return {
      year: businessYear,
      monthIndex: businessMonthIndex,
      key: `${businessYear}-${String(businessMonthIndex + 1).padStart(2, "0")}`,
      label: `${MONTH_NAMES[businessMonthIndex]} ${businessYear}`
    };
  };

  // --- Last 12 months (for KPI cards + bar chart) ---
  const localNow = new Date(Date.now() - tzOffsetMs);
  const currentLocalYear = localNow.getUTCFullYear();
  const currentLocalMonthIndex = localNow.getUTCMonth();
  const months: {
    month: string; label: string; orders: number; egpTotal: number;
    aedTotal: number; revenue: number; payout: number;
  }[] = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(currentLocalYear, currentLocalMonthIndex - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const label = `${MONTH_SHORT[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(-2)}`;

    const bizStart = getBusinessMonthStart(d.getUTCFullYear(), d.getUTCMonth());
    const bizEnd = getBusinessMonthEnd(d.getUTCFullYear(), d.getUTCMonth());

    const mo = orders.filter((o) => {
      const pd = new Date(o.processedAt);
      return pd >= bizStart && pd <= bizEnd;
    });

    const revenue = mo.reduce((s, o) => s + o.totalAmount, 0);
    const payout = mo.reduce((s, o) => s + calculatePayoutFromOrder(o), 0);
    const egpTotal = mo.reduce((s, o) =>
      typeof o.originalAmount === "number" && o.originalAmount > 0 ? s + o.originalAmount : s, 0);
    const aedTotal = mo.reduce((s, o) => s + calculateNetAedPayout(o), 0);

    months.push({ month: key, label, orders: mo.length, egpTotal, aedTotal, revenue, payout });
  }

  // --- All-time totals ---
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((s, o) => s + o.totalAmount, 0);
  const totalPayout = orders.reduce((s, o) => s + calculatePayoutFromOrder(o), 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const allTimeEGP = orders.reduce((s, o) =>
    typeof o.originalAmount === "number" && o.originalAmount > 0 ? s + o.originalAmount : s, 0);
  const allTimeAED = orders.reduce((s, o) => s + calculateNetAedPayout(o), 0);

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
    label: string; ordersCount: number; egpTotal: number; aedTotal: number; revenue: number; payout: number;
    days: Map<string, { label: string; ordersCount: number; egpTotal: number; aedTotal: number; revenue: number; payout: number }>;
  }>();

  for (const o of orders) {
    const processedAt = new Date(o.processedAt);
    const { key: monthKey, label: monthLabel } = getBusinessMonthMeta(processedAt);
    const { year: localYear, monthIndex: localMonthIndex, day: localDay } = getLocalDateParts(processedAt);
    const dateKey = `${localYear}-${String(localMonthIndex + 1).padStart(2, "0")}-${String(localDay).padStart(2, "0")}`;

    if (!allMonthMap.has(monthKey)) {
      allMonthMap.set(monthKey, {
        label: monthLabel,
        ordersCount: 0, egpTotal: 0, aedTotal: 0, revenue: 0, payout: 0, days: new Map()
      });
    }
    const m = allMonthMap.get(monthKey)!;
    m.ordersCount++;
    m.revenue += o.totalAmount;
    m.payout += calculatePayoutFromOrder(o);
    if (typeof o.originalAmount === "number" && o.originalAmount > 0) m.egpTotal += o.originalAmount;
    m.aedTotal += calculateNetAedPayout(o);

    if (!m.days.has(dateKey)) {
      m.days.set(dateKey, {
        label: `${MONTH_SHORT[localMonthIndex]} ${localDay}`,
        ordersCount: 0, egpTotal: 0, aedTotal: 0, revenue: 0, payout: 0
      });
    }
    const day = m.days.get(dateKey)!;
    day.ordersCount++;
    day.revenue += o.totalAmount;
    day.payout += calculatePayoutFromOrder(o);
    if (typeof o.originalAmount === "number" && o.originalAmount > 0) day.egpTotal += o.originalAmount;
    day.aedTotal += calculateNetAedPayout(o);
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
      payout: data.payout,
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
