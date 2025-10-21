import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensureVenue } from "@/lib/order-utils";
import { authOptions } from "@/lib/auth";

const lineItemSchema = z.object({
  productName: z.string().min(1),
  quantity: z.number().int().min(1),
  sku: z.string().optional().nullable(),
  price: z.number().nonnegative(),
  total: z.number().nonnegative()
});

const updateSchema = z
  .object({
    orderNumber: z.string().min(1).optional(),
    customerName: z.string().optional(),
    venue: z.string().optional(),
    status: z.string().optional(),
    financialStatus: z.string().optional().nullable(),
    fulfillmentStatus: z.string().optional().nullable(),
    totalAmount: z.number().nonnegative().optional(),
    currency: z.string().optional(),
    processedAt: z.union([z.string(), z.date()]).optional(),
    shippingCity: z.string().optional().nullable(),
    shippingCountry: z.string().optional().nullable(),
    tags: z.array(z.string()).optional(),
    notes: z.string().optional().nullable(),
    lineItems: z.array(lineItemSchema).optional(),
    originalAmount: z.number().nonnegative().optional().nullable(),
    exchangeRate: z.number().positive().optional().nullable()
  })
  .strict();

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
  tags: Array.isArray(order.tags)
    ? order.tags.map((tag: any) => String(tag))
    : typeof order.tags === "string"
      ? order.tags.split(",").map((tag: string) => tag.trim())
      : [],
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

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const orderId = Number(params.id);
  if (Number.isNaN(orderId)) {
    return NextResponse.json({ message: "Invalid order id" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse({
    ...body,
    processedAt: body.processedAt ? new Date(body.processedAt) : undefined
  });

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    include: { lineItems: true, venue: true }
  });

  if (!existing) {
    return NextResponse.json({ message: "Order not found" }, { status: 404 });
  }

  const trimmedCustomerName = data.customerName?.trim();
  const customerName =
    trimmedCustomerName && trimmedCustomerName.length > 0 ? trimmedCustomerName : existing.customerName ?? "No Customer";
  const trimmedVenue = data.venue?.trim();
  const nextVenueName =
    trimmedVenue && trimmedVenue.length > 0
      ? trimmedVenue
      : existing.venue?.name ?? "CICCIO";
  const venueRecord = await ensureVenue(nextVenueName);
  const trimmedOrderNumber = data.orderNumber?.trim();
  const orderNumber =
    trimmedOrderNumber && trimmedOrderNumber.length > 0
      ? `#${trimmedOrderNumber.replace(/^#+/, "")}`
      : existing.orderNumber;
  const financialStatus =
    data.financialStatus && data.financialStatus.trim().length > 0
      ? data.financialStatus.trim()
      : existing.financialStatus ?? "Paid";
  const filteredLineItems = Array.isArray(data.lineItems)
    ? data.lineItems.filter((item) => item.productName.trim().length > 0)
    : null;
  const exchangeRate =
    typeof data.exchangeRate === "number" && data.exchangeRate > 0
      ? data.exchangeRate
      : existing.exchangeRate ?? 48.5;
  const originalAmount =
    typeof data.originalAmount === "number"
      ? data.originalAmount
      : existing.originalAmount !== null
        ? existing.originalAmount
        : null;
  const baseAmount =
    typeof originalAmount === "number" && exchangeRate > 0
      ? Number((originalAmount / exchangeRate).toFixed(4))
      : null;
  const computedTotal =
    baseAmount !== null
      ? Number((baseAmount * 1.035).toFixed(2))
      : data.totalAmount ?? existing.totalAmount;

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: {
        orderNumber,
        customerName,
        venueId: venueRecord.id,
        status: data.status ?? existing.status,
        financialStatus,
        fulfillmentStatus: data.fulfillmentStatus ?? existing.fulfillmentStatus,
        totalAmount: computedTotal,
        exchangeRate,
        currency: data.currency ?? existing.currency,
        processedAt:
          data.processedAt instanceof Date
            ? data.processedAt
            : data.processedAt
              ? new Date(data.processedAt)
              : existing.processedAt,
        tags: Array.isArray(data.tags) ? data.tags.join(",") : existing.tags,
        notes: data.notes ?? existing.notes,
        originalAmount:
          typeof originalAmount === "number" ? originalAmount : null
      }
    });

    if (Array.isArray(filteredLineItems)) {
      await tx.orderLineItem.deleteMany({ where: { orderId } });
      if (filteredLineItems.length) {
        await tx.orderLineItem.createMany({
          data: filteredLineItems.map((item) => ({
            orderId,
            productName: item.productName,
            quantity: item.quantity,
            sku: item.sku ?? undefined,
            price: item.price,
            total: item.total
          }))
        });
      }
    }
  });

  const updated = await prisma.order.findUnique({
    where: { id: orderId },
    include: { lineItems: true, venue: true }
  });

  if (!updated) {
    return NextResponse.json({ message: "Order not found after update" }, { status: 404 });
  }

  return NextResponse.json(serializeOrder(updated));
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const orderId = Number(params.id);
  if (Number.isNaN(orderId)) {
    return NextResponse.json({ message: "Invalid order id" }, { status: 400 });
  }

  await prisma.order.delete({
    where: { id: orderId }
  });

  return NextResponse.json(null, { status: 204 });
}
