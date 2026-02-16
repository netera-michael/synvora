import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { SHOPIFY_API_VERSION } from "@/lib/shopify";

const schema = z.object({
  storeId: z.number()
});

type ShopifyProduct = {
  id: number;
  title: string;
  variants: Array<{
    id: number;
    sku: string | null;
    price: string;
  }>;
  status: string;
};

/**
 * Fetch products from Shopify store
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

  const { storeId } = parsed.data;

  try {
    // Fetch the Shopify store
    const store = await prisma.shopifyStore.findUnique({
      where: { id: storeId },
      include: {
        venue: true
      }
    });

    if (!store) {
      return NextResponse.json({ message: "Store not found" }, { status: 404 });
    }

    // Fetch products from Shopify
    const url = new URL(`https://${store.storeDomain}/admin/api/${SHOPIFY_API_VERSION}/products.json`);
    url.searchParams.set("limit", "250");
    url.searchParams.set("status", "active");

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": store.accessToken
      },
      cache: "no-store"
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Shopify request failed: ${response.status} ${message}`);
    }

    const data = (await response.json()) as { products: ShopifyProduct[] };

    // Transform products for easier consumption
    const products = data.products.flatMap((product) =>
      product.variants.map((variant) => ({
        shopifyProductId: String(product.id),
        name: product.title,
        sku: variant.sku,
        price: parseFloat(variant.price),
        status: product.status
      }))
    );

    return NextResponse.json({
      products,
      store: {
        id: store.id,
        domain: store.storeDomain,
        nickname: store.nickname,
        venue: {
          id: store.venue.id,
          name: store.venue.name
        }
      },
      count: products.length
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch products from Shopify";
    console.error("Shopify products fetch error:", error);
    return NextResponse.json({ message }, { status: 500 });
  }
}
