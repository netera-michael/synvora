import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const payoutSchema = z.object({
  amount: z.number().optional(),
  currency: z.string().optional(),
  status: z.string().optional(),
  description: z.string().optional(),
  account: z.string().optional(),
  processedAt: z.union([z.string(), z.date()]).optional(),
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

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payoutId = Number(params.id);
  if (Number.isNaN(payoutId)) {
    return NextResponse.json({ message: "Invalid payout id" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = payoutSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const data: any = {};
  if (parsed.data.amount !== undefined) data.amount = parsed.data.amount;
  if (parsed.data.currency) data.currency = parsed.data.currency;
  if (parsed.data.status) data.status = parsed.data.status;
  if (parsed.data.description !== undefined) data.description = parsed.data.description;
  if (parsed.data.account !== undefined) data.account = parsed.data.account;
  if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;
  if (parsed.data.venueId !== undefined) data.venueId = parsed.data.venueId;
  if (parsed.data.processedAt) {
    data.processedAt = parsed.data.processedAt instanceof Date ? parsed.data.processedAt : new Date(parsed.data.processedAt);
  }

  const payout = await prisma.payout.update({
    where: { id: payoutId },
    data,
    include: {
      venue: true,
      createdBy: true
    }
  });

  return NextResponse.json({ payout: serialize(payout) });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payoutId = Number(params.id);
  if (Number.isNaN(payoutId)) {
    return NextResponse.json({ message: "Invalid payout id" }, { status: 400 });
  }

  await prisma.payout.delete({ where: { id: payoutId } });

  return NextResponse.json(null, { status: 204 });
}
