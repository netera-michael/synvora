import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { calculatePayoutFromOrder } from "@/lib/order-utils";

const dateRangeSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
  startDate: z
    .string()
    .regex(/^\d{2}\/\d{2}\/\d{4}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{2}\/\d{2}\/\d{4}$/)
    .optional()
});

function escapeCsvValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }
  const stringValue = String(value);
  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
}

function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2
  }).format(amount);
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = session.user.role === "ADMIN";
  const venueIds = (session.user.venueIds ?? []).map((id) => Number(id)).filter((id) => !Number.isNaN(id));
  const url = new URL(request.url);
  const { searchParams } = url;
  
  const parseResult = dateRangeSchema.safeParse({
    month: searchParams.get("month") ?? undefined,
    startDate: searchParams.get("startDate") ?? undefined,
    endDate: searchParams.get("endDate") ?? undefined
  });
  const tzOffsetMinutes = Number(searchParams.get("tzOffset") ?? "0");
  const tzOffsetMs = tzOffsetMinutes * 60 * 1000;

  if (!parseResult.success) {
    return NextResponse.json({ message: "Invalid filters" }, { status: 400 });
  }

  const where: any = {};
  let rangeStart: Date | undefined;
  let rangeEnd: Date | undefined;

  const parseLocalDate = (value?: string | null) => {
    if (!value) return undefined;
    const parts = value.split('/');
    if (parts.length !== 3) return undefined;
    const [day, month, year] = parts.map((segment) => Number(segment));
    if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) {
      return undefined;
    }
    return { day, month, year };
  };

  const startPayload = parseLocalDate(parseResult.data.startDate);
  const endPayload = parseLocalDate(parseResult.data.endDate);

  if (startPayload || endPayload) {
    const start = startPayload ?? endPayload!;
    const end = endPayload ?? startPayload!;

    let startDate = new Date(Date.UTC(start.year, start.month - 1, start.day, 0, 0, 0, 0) - tzOffsetMs);
    let endDate = new Date(Date.UTC(end.year, end.month - 1, end.day, 23, 59, 59, 999) - tzOffsetMs);

    if (startDate > endDate) {
      const temp = startDate;
      startDate = endDate;
      endDate = temp;
    }

    rangeStart = startDate;
    rangeEnd = endDate;
  } else if (parseResult.data.month) {
    const [year, month] = parseResult.data.month.split('-').map((value) => Number(value));
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0) - tzOffsetMs);
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999) - tzOffsetMs);
    rangeStart = startDate;
    rangeEnd = endDate;
  }

  if (rangeStart && rangeEnd) {
    where.processedAt = {
      gte: rangeStart,
      lte: rangeEnd
    };
  }

  if (!isAdmin) {
    if (!venueIds.length) {
      return NextResponse.json({ message: "No access" }, { status: 403 });
    }
    where.venueId = {
      in: venueIds
    };
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      lineItems: true,
      venue: true
    },
    orderBy: [
      {
        processedAt: "desc"
      },
      {
        id: "desc"
      }
    ]
  });

  // CSV Headers
  const headers = [
    "Order Number",
    "Shopify Order Number",
    "Customer Name",
    "Venue",
    "Date",
    "Status",
    "Financial Status",
    "Fulfillment Status",
    "Total Amount (USD)",
    "Payout Amount (USD)",
    "Original Amount (EGP)",
    "Exchange Rate",
    "Currency",
    "Shipping City",
    "Shipping Country",
    "Tags",
    "Notes",
    "Source"
  ];

  // Generate CSV rows
  const rows = orders.map((order) => {
    const payoutAmount = calculatePayoutFromOrder({
      originalAmount: order.originalAmount,
      exchangeRate: order.exchangeRate,
      totalAmount: order.totalAmount
    });

    return [
      escapeCsvValue(order.orderNumber),
      escapeCsvValue(order.shopifyOrderNumber || ""),
      escapeCsvValue(order.customerName),
      escapeCsvValue(order.venue?.name || "CICCIO"),
      escapeCsvValue(formatDate(order.processedAt)),
      escapeCsvValue(order.status),
      escapeCsvValue(order.financialStatus || ""),
      escapeCsvValue(order.fulfillmentStatus || ""),
      escapeCsvValue(order.totalAmount.toFixed(2)),
      escapeCsvValue(payoutAmount.toFixed(2)),
      escapeCsvValue(order.originalAmount?.toFixed(2) || ""),
      escapeCsvValue(order.exchangeRate?.toFixed(2) || ""),
      escapeCsvValue(order.currency),
      escapeCsvValue(order.shippingCity || ""),
      escapeCsvValue(order.shippingCountry || ""),
      escapeCsvValue(order.tags || ""),
      escapeCsvValue(order.notes || ""),
      escapeCsvValue(order.source)
    ];
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(","))
  ].join("\n");

  // Generate filename with date range
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  let filename = `orders-export-${dateStr}.csv`;
  
  if (parseResult.data.month) {
    filename = `orders-${parseResult.data.month}.csv`;
  } else if (parseResult.data.startDate && parseResult.data.endDate) {
    const start = parseResult.data.startDate.replace(/\//g, "-");
    const end = parseResult.data.endDate.replace(/\//g, "-");
    filename = `orders-${start}-to-${end}.csv`;
  }

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}

