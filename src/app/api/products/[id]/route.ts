import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  sku: z.string().optional(),
  shopifyProductId: z.string().optional(),
  egpPrice: z.number().min(0).optional(),
  active: z.boolean().optional()
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const productId = parseInt(params.id, 10);
  if (isNaN(productId)) {
    return NextResponse.json({ message: "Invalid product ID" }, { status: 400 });
  }

  const payload = await request.json();
  const parsed = updateSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return NextResponse.json({ message: "Product not found" }, { status: 404 });
    }

    // If SKU is being updated, check for conflicts
    if (parsed.data.sku && parsed.data.sku !== product.sku) {
      const existing = await prisma.product.findUnique({
        where: {
          sku_venueId: {
            sku: parsed.data.sku,
            venueId: product.venueId
          }
        }
      });

      if (existing && existing.id !== productId) {
        return NextResponse.json(
          { message: "Product with this SKU already exists for this venue" },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: parsed.data,
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

    return NextResponse.json({ product: updated });
  } catch (error: any) {
    console.error("Failed to update product:", error);
    return NextResponse.json(
      { message: "Failed to update product", error: error?.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const productId = parseInt(params.id, 10);
  if (isNaN(productId)) {
    return NextResponse.json({ message: "Invalid product ID" }, { status: 400 });
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return NextResponse.json({ message: "Product not found" }, { status: 404 });
    }

    await prisma.product.delete({
      where: { id: productId }
    });

    return NextResponse.json({ message: "Product deleted successfully" });
  } catch (error: any) {
    console.error("Failed to delete product:", error);
    return NextResponse.json(
      { message: "Failed to delete product", error: error?.message },
      { status: 500 }
    );
  }
}
