import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

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
  lineItems: z.array(lineItemSchema).default([]),
  originalAmount: z.number().nonnegative().optional().nullable(),
  exchangeRate: z.number().positive().optional().nullable()
});

const dateRangeSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
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
  lineItems: order.lineItems.map((item: any) => ({
    id: item.id,
    productName: item.productName,
    quantity: item.quantity,
    sku: item.sku,
    price: item.price,
    total: item.total
  })),
  shopifyStoreId: order.shopifyStoreId
});

const extractOrderNumber = (orderNumber?: string | null) => {
  if (!orderNumber) {
    return undefined;
  }
  const digits = orderNumber.match(/\d+/g);
  if (!digits || digits.length === 0) {
    return undefined;
  }
  return Number(digits[digits.length - 1]);
};

const generateNextOrderNumber = async () => {
  const lastOrder = await prisma.order.findFirst({
    orderBy: { id: "desc" },
    select: { orderNumber: true }
  });

  const lastNumeric = extractOrderNumber(lastOrder?.orderNumber);
  const nextNumeric = (lastNumeric ?? 1000) + 1;
  return `#${nextNumeric}`;
};

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parseResult = dateRangeSchema.safeParse({
    month: searchParams.get("month") ?? undefined
  });

  if (!parseResult.success) {
    return NextResponse.json({ message: "Invalid filters" }, { status: 400 });
  }

  const where: any = {};
  if (parseResult.data.month) {
    const [year, month] = parseResult.data.month.split("-").map((value) => Number(value));
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    where.processedAt = {
      gte: start,
      lte: end
    };
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      lineItems: true
    },
    orderBy: {
      processedAt: "desc"
    }
  });

  const serialized = orders.map(serializeOrder);

  const totalRevenue = serialized.reduce((sum: number, order) => sum + Number(order.totalAmount ?? 0), 0);
  const ordersCount = serialized.length;
  const averageOrderValue = ordersCount ? totalRevenue / ordersCount : 0;
  const totalPayout = serialized.reduce((sum, order) => sum + calculatePayout(order), 0);
  const pendingFulfillment = serialized.filter(
    (order) => !order.fulfillmentStatus || order.fulfillmentStatus.toLowerCase() !== "fulfilled"
  ).length;
  const totalTicketsValue = serialized.reduce((sum, order) => sum + (typeof order.originalAmount === "number" ? order.originalAmount : 0), 0);

  return NextResponse.json({
    orders: serialized,
    metrics: {
      ordersCount,
      totalRevenue,
      averageOrderValue,
      totalPayout,
      totalTicketsValue,
      pendingFulfillment
    }
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
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

  const rawOrderNumber = data.orderNumber?.trim();
  const orderNumber = rawOrderNumber && rawOrderNumber.length > 0
    ? `#${rawOrderNumber.replace(/^#+/, "")}`
    : await generateNextOrderNumber();
  const financialStatus =
    data.financialStatus && data.financialStatus.trim().length > 0 ? data.financialStatus.trim() : "Paid";
  const exchangeRate =
    typeof data.exchangeRate === "number" && data.exchangeRate > 0 ? data.exchangeRate : 48.5;
  const originalAmount =
    typeof data.originalAmount === "number" && data.originalAmount >= 0 ? data.originalAmount : null;
  const baseAmount =
    originalAmount !== null && exchangeRate > 0 ? Number((originalAmount / exchangeRate).toFixed(4)) : null;
  const computedTotal =
    baseAmount !== null ? Number((baseAmount * 1.035).toFixed(2)) : data.totalAmount ?? 0;
  const lineItemsData = data.lineItems
    .filter((item) => item.productName.trim().length > 0)
    .map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
      sku: item.sku ?? undefined,
      price: item.price,
      total: item.total
    }));

  const created = await prisma.order.create({
    data: {
      orderNumber,
      customerName,
      status: data.status ?? "Open",
      financialStatus,
      fulfillmentStatus: data.fulfillmentStatus,
      totalAmount: computedTotal,
      currency: data.currency,
      processedAt: data.processedAt instanceof Date ? data.processedAt : new Date(data.processedAt),
      shippingCity: data.shippingCity,
      shippingCountry: data.shippingCountry,
      tags: (data.tags ?? []).join(","),
      notes: data.notes,
      originalAmount: typeof data.originalAmount === "number" ? data.originalAmount : null,
      exchangeRate,
      createdById: Number(session.user.id),
      lineItems: {
        create: lineItemsData
      }
    },
    include: {
      lineItems: true
    }
  });

  return NextResponse.json(serializeOrder(created), { status: 201 });
}
const calculatePayout = (order: ReturnType<typeof serializeOrder>) => {
  if (order.originalAmount !== null && typeof order.originalAmount === "number" && order.exchangeRate && order.exchangeRate > 0) {
    const base = order.originalAmount / order.exchangeRate;
    return base * 0.9825;
  }
  return order.totalAmount * 0.9825;
};
