import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

const mutationSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  venueId: z.number().int().positive(),
  amount: z.number().nonnegative(),
  note: z.string().max(500).optional().nullable()
});

const deleteSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  venueId: z.number().int().positive()
});

const toUtcDate = (value: string) => new Date(`${value}T00:00:00.000Z`);

const serializeDeduction = (deduction: {
  id: number;
  venueId: number;
  date: Date;
  amount: number;
  note: string | null;
  venue: { id: number; name: string; slug: string };
}) => ({
  id: deduction.id,
  venueId: deduction.venueId,
  date: deduction.date.toISOString().slice(0, 10),
  amount: deduction.amount,
  note: deduction.note,
  venue: deduction.venue
});

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    date: url.searchParams.get("date")
  });

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid date" }, { status: 400 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const deductions = await prisma.dailyDeduction.findMany({
    where: {
      date: toUtcDate(parsed.data.date)
    },
    include: {
      venue: {
        select: { id: true, name: true, slug: true }
      }
    },
    orderBy: [{ venueId: "asc" }]
  });

  return NextResponse.json({
    deductions: deductions
      .map(serializeDeduction)
      .sort((a, b) => a.venue.name.localeCompare(b.venue.name)),
    totalAmount: deductions.reduce((sum, deduction) => sum + deduction.amount, 0)
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = mutationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const venue = await prisma.venue.findUnique({
    where: { id: parsed.data.venueId },
    select: { id: true, name: true, slug: true }
  });

  if (!venue) {
    return NextResponse.json({ message: "Venue not found" }, { status: 404 });
  }

  const trimmedNote = parsed.data.note?.trim() || null;
  const date = toUtcDate(parsed.data.date);

  if (parsed.data.amount === 0) {
    await prisma.dailyDeduction.deleteMany({
      where: {
        venueId: parsed.data.venueId,
        date
      }
    });

    return NextResponse.json({ deduction: null });
  }

  const deduction = await prisma.dailyDeduction.upsert({
    where: {
      venueId_date: {
        venueId: parsed.data.venueId,
        date
      }
    },
    update: {
      amount: parsed.data.amount,
      note: trimmedNote
    },
    create: {
      venueId: parsed.data.venueId,
      date,
      amount: parsed.data.amount,
      note: trimmedNote
    },
    include: {
      venue: {
        select: { id: true, name: true, slug: true }
      }
    }
  });

  return NextResponse.json({ deduction: serializeDeduction(deduction) });
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = deleteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.dailyDeduction.deleteMany({
    where: {
      venueId: parsed.data.venueId,
      date: toUtcDate(parsed.data.date)
    }
  });

  return NextResponse.json(null, { status: 204 });
}
