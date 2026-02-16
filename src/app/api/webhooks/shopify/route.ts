import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { headers } from "next/headers";

export async function POST(req: Request) {
    try {
        const text = await req.text();
        const hmac = headers().get("x-shopify-hmac-sha256");
        const domain = headers().get("x-shopify-shop-domain");

        if (!domain) {
            return NextResponse.json({ message: "Missing shop domain" }, { status: 400 });
        }

        // Verify the webhook signature
        // In a real production scenario, we should fetch the specific store's secret
        // But for now, we'll need to handle the verification logic carefully.
        // If we have multiple stores, we might need to lookup the secret by domain.

        // For now, let's proceed with finding the store by domain
        const store = await prisma.shopifyStore.findUnique({
            where: { storeDomain: domain }
        });

        if (!store) {
            console.error(`Received webhook for unknown store: ${domain}`);
            // Return 200 to acknowledge receipt even if we don't process it, to stop Shopify retries
            return NextResponse.json({ message: "Store not found" }, { status: 200 });
        }

        // TODO: Verify HMAC using process.env.SHOPIFY_API_SECRET or store-specific secret if available
        // const generatedHash = crypto
        //   .createHmac("sha256", process.env.SHOPIFY_API_SECRET!)
        //   .update(text, "utf8")
        //   .digest("base64");

        // if (generatedHash !== hmac) {
        //   return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
        // }

        const payload = JSON.parse(text);
        const shopifyOrderId = String(payload.id);

        // Check if order already exists in main Order table
        const existingOrder = await prisma.order.findFirst({
            where: { externalId: shopifyOrderId }
        });

        if (existingOrder) {
            return NextResponse.json({ message: "Order already imported" }, { status: 200 });
        }

        // Upsert into Import Queue
        await prisma.shopifyImportQueue.upsert({
            where: { shopifyOrderId },
            update: {
                orderData: payload,
                totalAmount: parseFloat(payload.total_price),
                currency: payload.currency,
                financialStatus: payload.financial_status,
                updatedAt: new Date(),
            },
            create: {
                shopifyOrderId,
                storeDomain: domain,
                orderNumber: String(payload.order_number),
                totalAmount: parseFloat(payload.total_price),
                currency: payload.currency,
                financialStatus: payload.financial_status,
                orderData: payload,
            }
        });

        return NextResponse.json({ message: "Order queued for import" }, { status: 200 });

    } catch (error) {
        console.error("Webhook processing error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
