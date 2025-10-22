import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().optional(),
  tzOffset: z.coerce.number().optional()
});

const payoutSchema = z.object({
  amount: z.number(),
  currency: z.string().default("USD"),
  status: z.string().default("Posted"),
  description: z.string().default("Payout"),
  account: z.string().default("Payouts"),
  processedAt: z.union([z.string(), z.date()]),
  notes: z.string().optional().nullable(),
  venueId: z.number().int().optional().nullable()
});

const serialize = (payout: any) => ({
  id: payout.id,
  amount: payout.amount,
  currency: payout.currency,
  status: payout.status,
  description: payout.description,
  account: payout.account,
  processedAt: payout.processedAt.toISOString(),
  notes: payout.notes,
  venueId: payout.venueId,
  venue: payout.venue
    ? {
        id: payout.venue.id,
        name: payout.venue.name,
        slug: payout.venue.slug
      }
    : null,
  createdById: payout.createdById,
  createdBy: payout.createdBy
    ? {
        id: payout.createdBy.id,
        name: payout.createdBy.name,
        email: payout.createdBy.email
      }
    : null
});

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parseParams = paginationSchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parseParams.success) {
    return NextResponse.json({ message: "Invalid query" }, { status: 400 });
  }

  const { page = 1, pageSize = 20, search, tzOffset = 0 } = parseParams.data;
  const isAdmin = session.user.role === "ADMIN";
  const accessibleVenues = (session.user.venueIds ?? []).map((id) => Number(id)).filter((id) => !Number.isNaN(id));

  const where: any = {};

  if (!isAdmin) {
    if (!accessibleVenues.length) {
      return NextResponse.json({
        payouts: [],
        pagination: {
          page: 1,
          pageSize,
          totalCount: 0,
          totalPages: 0
        }
      });
    }

    where.venueId = {
      in: accessibleVenues
    };
  }

  if (search?.trim()) {
    const term = search.trim();
    where.OR = [
      { description: { contains: term, mode: "insensitive" } },
      { status: { contains: term, mode: "insensitive" } },
      { account: { contains: term, mode: "insensitive" } }
    ];
  }

  const totalCount = await prisma.payout.count({ where });
  const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);
  const currentPage = totalPages > 0 ? Math.min(page, totalPages) : 1;
  const skip = totalPages === 0 ? 0 : (currentPage - 1) * pageSize;

  const payouts = await prisma.payout.findMany({
    where,
    include: {
      venue: true,
      createdBy: true
    },
    orderBy: {
      processedAt: "desc"
    },
    skip,
    take: pageSize
  });

  const serialized = payouts.map(serialize);

  return NextResponse.json({
    payouts: serialized,
    pagination: {
      page: currentPage,
      pageSize,
      totalCount,
      totalPages
    }
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = payoutSchema.safeParse({
    ...body,
    processedAt: body.processedAt ? new Date(body.processedAt) : new Date()
  });

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const payout = await prisma.payout.create({
    data: {
      amount: parsed.data.amount,
      currency: parsed.data.currency ?? "USD",
      status: parsed.data.status ?? "Posted",
      description: parsed.data.description ?? "Payout",
      account: parsed.data.account ?? "Payouts",
      processedAt: parsed.data.processedAt instanceof Date ? parsed.data.processedAt : new Date(parsed.data.processedAt),
      notes: parsed.data.notes ?? null,
      venueId: parsed.data.venueId ?? null,
      createdById: Number(session.user.id)
    },
    include: {
      venue: true,
      createdBy: true
    }
  });

  return NextResponse.json({ payout: serialize(payout) }, { status: 201 });
}
