import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const updateSchema = z.object({
  storeDomain: z.string().min(5).optional(),
  accessToken: z.string().min(10).optional(),
  nickname: z.string().optional(),
  venueId: z.number().optional()
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

  const storeId = parseInt(params.id, 10);

  if (isNaN(storeId)) {
    return NextResponse.json({ message: "Invalid store ID" }, { status: 400 });
  }

  const payload = await request.json();
  const parsed = updateSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updates = parsed.data;

  try {
    // Check if store exists
    const existing = await prisma.shopifyStore.findUnique({
      where: { id: storeId }
    });

    if (!existing) {
      return NextResponse.json({ message: "Store not found" }, { status: 404 });
    }

    // If updating venue, check if it exists
    if (updates.venueId) {
      const venue = await prisma.venue.findUnique({
        where: { id: updates.venueId }
      });

      if (!venue) {
        return NextResponse.json({ message: "Venue not found" }, { status: 404 });
      }
    }

    // If updating store domain, check for conflicts
    if (updates.storeDomain && updates.storeDomain !== existing.storeDomain) {
      const domainConflict = await prisma.shopifyStore.findUnique({
        where: { storeDomain: updates.storeDomain }
      });

      if (domainConflict) {
        return NextResponse.json(
          { message: "Store with this domain already exists" },
          { status: 409 }
        );
      }
    }

    // Update the store
    const store = await prisma.shopifyStore.update({
      where: { id: storeId },
      data: updates,
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

    return NextResponse.json({ store });
  } catch (error) {
    console.error("Failed to update Shopify store:", error);
    return NextResponse.json(
      { message: "Failed to update store" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

  const storeId = parseInt(params.id, 10);

  if (isNaN(storeId)) {
    return NextResponse.json({ message: "Invalid store ID" }, { status: 400 });
  }

  try {
    // Check if store exists
    const existing = await prisma.shopifyStore.findUnique({
      where: { id: storeId },
      include: {
        _count: {
          select: {
            orders: true
          }
        }
      }
    });

    if (!existing) {
      return NextResponse.json({ message: "Store not found" }, { status: 404 });
    }

    // Check if store has orders
    if (existing._count.orders > 0) {
      return NextResponse.json(
        {
          message: `Cannot delete store with ${existing._count.orders} orders. Please delete or reassign orders first.`
        },
        { status: 400 }
      );
    }

    // Delete the store
    await prisma.shopifyStore.delete({
      where: { id: storeId }
    });

    return NextResponse.json({ message: "Store deleted successfully" });
  } catch (error) {
    console.error("Failed to delete Shopify store:", error);
    return NextResponse.json(
      { message: "Failed to delete store" },
      { status: 500 }
    );
  }
}
