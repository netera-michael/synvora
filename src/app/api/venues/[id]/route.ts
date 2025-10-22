import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { slugify } from "@/lib/order-utils";

const venueSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long")
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const venueId = Number(params.id);
  if (Number.isNaN(venueId)) {
    return NextResponse.json({ message: "Invalid venue id" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = venueSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const name = parsed.data.name.trim();
  const slug = slugify(name);

  // Check for existing venue by slug OR name (case-insensitive), excluding current venue
  const [existingSlug, existingName] = await Promise.all([
    prisma.venue.findUnique({ where: { slug } }),
    prisma.venue.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive'
        }
      }
    })
  ]);

  if ((existingSlug && existingSlug.id !== venueId) || (existingName && existingName.id !== venueId)) {
    return NextResponse.json({ message: "Another venue already uses this name" }, { status: 409 });
  }

  const updated = await prisma.venue.update({
    where: { id: venueId },
    data: {
      name,
      slug
    },
    include: {
      _count: {
        select: {
          users: true,
          orders: true
        }
      }
    }
  });

  return NextResponse.json({
    venue: {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      userCount: updated._count.users,
      orderCount: updated._count.orders
    }
  });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const venueId = Number(params.id);
  if (Number.isNaN(venueId)) {
    return NextResponse.json({ message: "Invalid venue id" }, { status: 400 });
  }

  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    include: {
      _count: {
        select: {
          orders: true,
          users: true
        }
      }
    }
  });

  if (!venue) {
    return NextResponse.json({ message: "Venue not found" }, { status: 404 });
  }

  if (venue._count.orders > 0) {
    return NextResponse.json({ message: "Cannot delete a venue with orders" }, { status: 400 });
  }

  await prisma.venue.delete({ where: { id: venueId } });

  return NextResponse.json(null, { status: 204 });
}
