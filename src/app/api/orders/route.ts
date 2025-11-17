import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import {
  calculateFromOriginalAmount,
  calculatePayoutFromOrder,
  DEFAULT_EXCHANGE_RATE,
  ensureVenue,
  generateNextOrderNumber
} from "@/lib/order-utils";
import { getCurrentExchangeRate } from "@/lib/exchange-rate";

const lineItemSchema = z.object({
  productName: z.string().min(1),
  quantity: z.number().int().min(1),
  sku: z.string().optional().nullable(),
  price: z.number().nonnegative(),
  total: z.number().nonnegative()
});

const orderSchema = z.object({
  orderNumber: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
  venue: z.string().optional().nullable(),
  status: z.string().default("Open"),
  financialStatus: z.string().optional().nullable(),
  fulfillmentStatus: z.string().optional().nullable(),
  totalAmount: z.number().nonnegative().optional().nullable(),
  currency: z.string().default("USD"),
  processedAt: z.union([z.string(), z.date()]),
  shippingCity: z.string().optional().nullable(),
  shippingCountry: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional().nullable(),
  originalAmount: z.number().nonnegative().optional().nullable(),
  exchangeRate: z.number().positive().optional().nullable()
});

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

const mapTags = (tags: unknown): string[] => {
  if (!tags) {
    return [];
  }

  if (Array.isArray(tags)) {
    return tags.flatMap((tag) => {
      if (typeof tag === "string") {
        return tag;
      }
      if (typeof tag === "number") {
        return String(tag);
      }
      return [];
    });
  }

  if (typeof tags === "string") {
    return tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
};

const serializeOrder = (order: any) => ({
  id: order.id,
  externalId: order.externalId,
  orderNumber: order.orderNumber,
  customerName: order.customerName,
  venueId: order.venueId,
  venue: order.venue
    ? {
        id: order.venue.id,
        name: order.venue.name,
        slug: order.venue.slug
      }
    : {
        id: 0,
        name: "CICCIO",
        slug: "ciccio"
      },
  status: order.status,
  financialStatus: order.financialStatus,
  fulfillmentStatus: order.fulfillmentStatus,
  totalAmount: order.totalAmount,
  currency: order.currency,
  processedAt: order.processedAt.toISOString(),
  shippingCity: order.shippingCity,
  shippingCountry: order.shippingCountry,
  tags: mapTags(order.tags),
  notes: order.notes,
  source: order.source,
  exchangeRate: order.exchangeRate,
  originalAmount: order.originalAmount,
  shopifyStoreId: order.shopifyStoreId
});

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = session.user.role === "ADMIN";
  const venueIds = (session.user.venueIds ?? []).map((id) => Number(id)).filter((id) => !Number.isNaN(id));
  const url = new URL(request.url);
  const { searchParams } = url;
  const rawPage = searchParams.get("page");
  const rawPageSize = searchParams.get("pageSize");
  const allPagesRequested = rawPage?.toLowerCase() === "all";

  let page = 1;
  let pageSize = 20;

  if (!allPagesRequested) {
    const parsedPage = rawPage ? Number.parseInt(rawPage, 10) : Number.NaN;
    if (!Number.isNaN(parsedPage) && parsedPage > 0) {
      page = parsedPage;
    }

    const parsedPageSize = rawPageSize ? Number.parseInt(rawPageSize, 10) : Number.NaN;
    if (!Number.isNaN(parsedPageSize) && parsedPageSize > 0) {
      pageSize = Math.min(parsedPageSize, 100);
    }
  } else {
    pageSize = 0;
  }
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

    let startDate = new Date(Date.UTC(start.year, start.month - 1, start.day, 0, 0, 0, 0) + tzOffsetMs);
    let endDate = new Date(Date.UTC(end.year, end.month - 1, end.day, 23, 59, 59, 999) + tzOffsetMs);

    if (startDate > endDate) {
      const temp = startDate;
      startDate = endDate;
      endDate = temp;
    }

    rangeStart = startDate;
    rangeEnd = endDate;
  } else if (parseResult.data.month) {
    const [year, month] = parseResult.data.month.split('-').map((value) => Number(value));
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0) + tzOffsetMs);
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999) + tzOffsetMs);
    rangeStart = startDate;
    rangeEnd = endDate;
  }

  if (rangeStart && rangeEnd) {
    where.processedAt = {
      gte: rangeStart,
      lte: rangeEnd
    };
  } else if (parseResult.data.month) {
    const [year, month] = parseResult.data.month.split("-").map((value) => Number(value));
    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0) + tzOffsetMs);
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999) + tzOffsetMs);
    where.processedAt = {
      gte: start,
      lte: end
    };
  }

  if (!isAdmin) {
    if (!venueIds.length) {
      const emptyMetrics = {
        ordersCount: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        totalPayout: 0,
        totalTicketsValue: 0,
        pendingFulfillment: 0
      };

      return NextResponse.json({
        orders: [],
        metrics: emptyMetrics,
        pagination: {
          page: 1,
          pageSize,
          totalCount: 0,
          totalPages: 0
        }
      });
    }

    where.venueId = {
      in: venueIds
    };
  }

  const searchTermRaw = searchParams.get("search") ?? "";
  const searchTerm = searchTermRaw.trim();

  if (searchTerm) {
    const normalized = searchTerm.startsWith("#") ? searchTerm.slice(1) : searchTerm;
    const searchConditions: any[] = [
      { orderNumber: { contains: searchTerm, mode: "insensitive" } },
      { customerName: { contains: searchTerm, mode: "insensitive" } },
      { financialStatus: { contains: searchTerm, mode: "insensitive" } },
      { fulfillmentStatus: { contains: searchTerm, mode: "insensitive" } },
      { shippingCity: { contains: searchTerm, mode: "insensitive" } },
      { shippingCountry: { contains: searchTerm, mode: "insensitive" } },
      { tags: { contains: searchTerm, mode: "insensitive" } }
    ];

    if (normalized && normalized !== searchTerm) {
      searchConditions.push({ orderNumber: { contains: normalized, mode: "insensitive" } });
    }

    where.AND = [
      ...(where.AND ?? []),
      {
        OR: searchConditions
      }
    ];
  }

  const totalCount = await prisma.order.count({ where });
  let totalPages = 0;

  if (allPagesRequested) {
    totalPages = totalCount === 0 ? 0 : 1;
    page = totalCount === 0 ? 1 : 1;
    pageSize = totalCount;
  } else {
    totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);

    if (totalPages > 0 && page > totalPages) {
      page = totalPages;
    }

    if (totalPages === 0) {
      page = 1;
    }
  }

  const skip = !allPagesRequested && totalPages !== 0 ? (page - 1) * pageSize : 0;

  const metricOrders = await prisma.order.findMany({
    where,
    select: {
      totalAmount: true,
      originalAmount: true,
      exchangeRate: true,
      fulfillmentStatus: true
    }
  });

  const orders = await prisma.order.findMany({
    where,
    include: {
      lineItems: true,
      venue: true
    },
    orderBy: {
      processedAt: "desc"
    },
    ...(allPagesRequested || totalPages === 0
      ? {}
      : {
          skip,
          take: pageSize
        })
  });

  const serialized = orders.map(serializeOrder);

  const ordersCount = totalCount;
  const totalRevenue = metricOrders.reduce((sum, order) => sum + Number(order.totalAmount ?? 0), 0);
  const averageOrderValue = ordersCount ? totalRevenue / ordersCount : 0;
  const totalPayout = metricOrders.reduce((sum, order) => sum + calculatePayoutFromOrder(order), 0);
  const pendingFulfillment = metricOrders.filter(
    (order) => !order.fulfillmentStatus || order.fulfillmentStatus.toLowerCase() !== "fulfilled"
  ).length;
  const totalTicketsValue = metricOrders.reduce(
    (sum, order) => sum + (typeof order.originalAmount === "number" ? order.originalAmount : 0),
    0
  );

  return NextResponse.json({
    orders: serialized,
    metrics: {
      ordersCount,
      totalRevenue,
      averageOrderValue,
      totalPayout,
      totalTicketsValue,
      pendingFulfillment
    },
    pagination: {
      page: allPagesRequested ? 1 : page,
      pageSize: allPagesRequested ? totalCount : pageSize,
      totalCount,
      totalPages
    }
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = orderSchema.safeParse({
    ...body,
    processedAt: body.processedAt ? new Date(body.processedAt) : new Date()
  });

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const trimmedCustomerName = data.customerName?.trim();
  const customerName = trimmedCustomerName && trimmedCustomerName.length > 0 ? trimmedCustomerName : "No Customer";
  const trimmedVenue = data.venue?.trim();
  const venueName = trimmedVenue && trimmedVenue.length > 0 ? trimmedVenue : "CICCIO";
  const venueRecord = await ensureVenue(venueName);

  const rawOrderNumber = data.orderNumber?.trim();
  const orderNumber = rawOrderNumber && rawOrderNumber.length > 0
    ? `#${rawOrderNumber.replace(/^#+/, "")}`
    : await generateNextOrderNumber();
  const financialStatus =
    data.financialStatus && data.financialStatus.trim().length > 0 ? data.financialStatus.trim() : "Paid";

  // Fetch current exchange rate if not provided
  let exchangeRate: number;
  if (typeof data.exchangeRate === "number" && data.exchangeRate > 0) {
    exchangeRate = data.exchangeRate;
  } else {
    // Auto-fetch current exchange rate with smart caching
    exchangeRate = await getCurrentExchangeRate("USD", "EGP");
  }

  const originalAmount =
    typeof data.originalAmount === "number" && data.originalAmount >= 0 ? data.originalAmount : null;
  const { totalAmount: computedTotal } = calculateFromOriginalAmount(originalAmount, exchangeRate);
  const totalAmount = computedTotal > 0 ? computedTotal : data.totalAmount ?? 0;
  const created = await prisma.order.create({
    data: {
      orderNumber,
      customerName,
      venueId: venueRecord.id,
      status: data.status ?? "Open",
      financialStatus,
      fulfillmentStatus: data.fulfillmentStatus,
      totalAmount,
      currency: data.currency,
      processedAt: data.processedAt instanceof Date ? data.processedAt : new Date(data.processedAt),
      shippingCity: data.shippingCity,
      shippingCountry: data.shippingCountry,
      tags: (data.tags ?? []).join(","),
      notes: data.notes,
      originalAmount: typeof data.originalAmount === "number" ? data.originalAmount : null,
      exchangeRate,
      createdById: Number(session.user.id)
    },
    include: {
      venue: true
    }
  });

  return NextResponse.json(serializeOrder(created), { status: 201 });
}
