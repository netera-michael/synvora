import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { slugify } from "@/lib/order-utils";

const venueSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long")
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const venues = await prisma.venue.findMany({
    orderBy: { name: "asc" },
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
    venues: venues.map((venue) => ({
      id: venue.id,
      name: venue.name,
      slug: venue.slug,
      createdAt: venue.createdAt.toISOString(),
      updatedAt: venue.updatedAt.toISOString(),
      userCount: venue._count.users,
      orderCount: venue._count.orders
    }))
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = venueSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const name = parsed.data.name.trim();
  const slug = slugify(name);

  const existing = await prisma.venue.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ message: "A venue with this name already exists" }, { status: 409 });
  }

  const venue = await prisma.venue.create({
    data: {
      name,
      slug
    }
  });

  return NextResponse.json(
    {
      venue: {
        id: venue.id,
        name: venue.name,
        slug: venue.slug,
        createdAt: venue.createdAt.toISOString(),
        updatedAt: venue.updatedAt.toISOString(),
        userCount: 0,
        orderCount: 0
      }
    },
    { status: 201 }
  );
}
