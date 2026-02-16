import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const bulkDeleteSchema = z.object({
    ids: z.array(z.number()).min(1),
});

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    try {
        const body = await request.json();
        const parsed = bulkDeleteSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { message: "Invalid payload", issues: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const { ids } = parsed.data;

        // Delete orders and their associated line items (handled by DB cascade or manually)
        // Check if lineItems have cascade delete in schema
        const deletedCount = await prisma.order.deleteMany({
            where: {
                id: {
                    in: ids,
                },
            },
        });

        return NextResponse.json({
            message: `Successfully deleted ${deletedCount.count} orders`,
            count: deletedCount.count,
        });
    } catch (error) {
        console.error("Bulk delete error:", error);
        return NextResponse.json(
            { message: "Failed to delete orders" },
            { status: 500 }
        );
    }
}
