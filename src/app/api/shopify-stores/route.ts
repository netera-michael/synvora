import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const createSchema = z.object({
  storeDomain: z.string().min(5),
  accessToken: z.string().min(10),
  nickname: z.string().optional(),
  venueId: z.number()
});

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const stores = await prisma.shopifyStore.findMany({
      include: {
        venue: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        _count: {
          select: {
            orders: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json({ stores });
  } catch (error) {
    console.error("Failed to fetch Shopify stores:", error);
    return NextResponse.json(
      { message: "Failed to fetch stores" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const payload = await request.json();
  const parsed = createSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { storeDomain, accessToken, nickname, venueId } = parsed.data;

  try {
    // Check if venue exists
    const venue = await prisma.venue.findUnique({
      where: { id: venueId }
    });

    if (!venue) {
      return NextResponse.json({ message: "Venue not found" }, { status: 404 });
    }

    // Check if store domain already exists
    const existing = await prisma.shopifyStore.findUnique({
      where: { storeDomain }
    });

    if (existing) {
      return NextResponse.json(
        { message: "Store with this domain already exists" },
        { status: 409 }
      );
    }

    // Create the store
    const store = await prisma.shopifyStore.create({
      data: {
        storeDomain,
        accessToken,
        nickname,
        venueId,
        ownerId: Number(session.user.id)
      },
      include: {
        venue: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });

    return NextResponse.json({ store }, { status: 201 });
  } catch (error) {
    console.error("Failed to create Shopify store:", error);
    return NextResponse.json(
      { message: "Failed to create store" },
      { status: 500 }
    );
  }
}
