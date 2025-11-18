import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const createSchema = z.object({
  name: z.string().min(1),
  sku: z.string().nullable().optional(),
  shopifyProductId: z.string().nullable().optional(),
  egpPrice: z.number().min(0),
  venueId: z.number(),
  active: z.boolean().default(true)
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
    const products = await prisma.product.findMany({
      include: {
        venue: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json({ products });
  } catch (error: any) {
    console.error("Failed to fetch products:", error);
    return NextResponse.json(
      { message: "Failed to fetch products", error: error?.message },
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

  const { name, sku, shopifyProductId, egpPrice, venueId, active } = parsed.data;

  try {
    // Check if venue exists
    const venue = await prisma.venue.findUnique({
      where: { id: venueId }
    });

    if (!venue) {
      return NextResponse.json({ message: "Venue not found" }, { status: 404 });
    }

    // Check if SKU already exists for this venue
    if (sku) {
      const existing = await prisma.product.findUnique({
        where: {
          sku_venueId: {
            sku,
            venueId
          }
        }
      });

      if (existing) {
        return NextResponse.json(
          { message: "Product with this SKU already exists for this venue" },
          { status: 409 }
        );
      }
    }

    // Create the product
    const product = await prisma.product.create({
      data: {
        name,
        sku,
        shopifyProductId,
        egpPrice,
        venueId,
        active
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

    return NextResponse.json({ product }, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create product:", error);
    return NextResponse.json(
      { message: "Failed to create product", error: error?.message },
      { status: 500 }
    );
  }
}
