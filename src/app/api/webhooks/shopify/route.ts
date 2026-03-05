import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { headers } from "next/headers";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

function verifyShopifyHmac(body: string, hmac: string, secret: string): boolean {
    const generatedHash = crypto
        .createHmac("sha256", secret)
        .update(body, "utf8")
        .digest("base64");
    // Use timingSafeEqual to prevent timing attacks
    try {
        return crypto.timingSafeEqual(
            Buffer.from(generatedHash),
            Buffer.from(hmac)
        );
    } catch {
        return false;
    }
}

export async function POST(req: Request) {
    // Rate limit: 100 webhook calls per minute per IP
    const ip = getClientIp(req);
    const rl = rateLimit(`webhook-shopify:${ip}`, { limit: 100, windowSeconds: 60 });
    if (!rl.success) {
        return NextResponse.json({ message: "Too many requests" }, { status: 429 });
    }

    try {
        const text = await req.text();
        const hmac = headers().get("x-shopify-hmac-sha256");
        const domain = headers().get("x-shopify-shop-domain");

        if (!domain) {
            return NextResponse.json({ message: "Missing shop domain" }, { status: 400 });
        }

        if (!hmac) {
            return NextResponse.json({ message: "Missing HMAC signature" }, { status: 401 });
        }

        // Find the store by domain
        const store = await prisma.shopifyStore.findUnique({
            where: { storeDomain: domain }
        });

        if (!store) {
            console.error(`Received webhook for unknown store: ${domain}`);
            // Return 200 to acknowledge receipt and stop Shopify retries
            return NextResponse.json({ message: "Store not found" }, { status: 200 });
        }

        // Verify HMAC signature
        // Uses SHOPIFY_WEBHOOK_SECRET env var if set (recommended for shared-secret app setups),
        // otherwise skips verification with a warning (for custom app setups without a global secret).
        const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
        if (webhookSecret) {
            const isValid = verifyShopifyHmac(text, hmac, webhookSecret);
            if (!isValid) {
                console.error(`Invalid HMAC signature for webhook from ${domain}`);
                return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
            }
        } else {
            console.warn("SHOPIFY_WEBHOOK_SECRET not set — skipping HMAC verification. Set this env var in production.");
        }

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
