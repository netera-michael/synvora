import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const schema = z.object({
  storeId: z.number(),
  products: z.array(
    z.object({
      shopifyProductId: z.string(),
      name: z.string(),
      sku: z.string().nullable(),
      egpPrice: z.number().min(0)
    })
  )
});

/**
 * Import products from Shopify into the database
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const payload = await request.json();
  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { storeId, products } = parsed.data;

  try {
    // Fetch the Shopify store to get venueId
    const store = await prisma.shopifyStore.findUnique({
      where: { id: storeId },
      select: { venueId: true }
    });

    if (!store) {
      return NextResponse.json({ message: "Store not found" }, { status: 404 });
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const product of products) {
      try {
        // Check if product already exists by Shopify Product ID
        const existing = await prisma.product.findFirst({
          where: {
            shopifyProductId: product.shopifyProductId,
            venueId: store.venueId
          }
        });

        if (existing) {
          // Update existing product
          await prisma.product.update({
            where: { id: existing.id },
            data: {
              name: product.name,
              sku: product.sku,
              egpPrice: product.egpPrice
            }
          });
          updated += 1;
        } else {
          // Check for SKU conflicts if SKU is provided
          if (product.sku) {
            const skuConflict = await prisma.product.findUnique({
              where: {
                sku_venueId: {
                  sku: product.sku,
                  venueId: store.venueId
                }
              }
            });

            if (skuConflict) {
              errors.push(
                `Product "${product.name}" has SKU conflict with existing product`
              );
              skipped += 1;
              continue;
            }
          }

          // Create new product
          await prisma.product.create({
            data: {
              name: product.name,
              sku: product.sku,
              shopifyProductId: product.shopifyProductId,
              egpPrice: product.egpPrice,
              venueId: store.venueId,
              active: true
            }
          });
          created += 1;
        }
      } catch (error: any) {
        console.error(`Failed to import product ${product.name}:`, error);
        errors.push(`${product.name}: ${error.message}`);
        skipped += 1;
      }
    }

    return NextResponse.json({
      created,
      updated,
      skipped,
      totalProcessed: products.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to import products";
    console.error("Product import error:", error);
    return NextResponse.json({ message }, { status: 500 });
  }
}
