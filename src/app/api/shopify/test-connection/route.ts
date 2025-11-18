import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";

const schema = z.object({
  storeDomain: z.string().min(5),
  accessToken: z.string().min(10)
});

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

  const { storeDomain, accessToken } = parsed.data;

  try {
    // Test connection by fetching shop info
    const url = `https://${storeDomain}/admin/api/2023-10/shop.json`;

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken
      },
      cache: "no-store"
    });

    if (!response.ok) {
      let errorMessage = "Failed to connect to Shopify";

      if (response.status === 401 || response.status === 403) {
        errorMessage = "Invalid access token or insufficient permissions";
      } else if (response.status === 404) {
        errorMessage = "Store not found. Please check the store domain";
      }

      return NextResponse.json(
        {
          success: false,
          message: errorMessage
        },
        { status: 200 } // Return 200 so client can handle the error gracefully
      );
    }

    const data = await response.json();
    const shopName = data.shop?.name || "Unknown Shop";

    return NextResponse.json({
      success: true,
      message: `Successfully connected to ${shopName}`,
      shopName
    });
  } catch (error: unknown) {
    console.error("Connection test failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to connect. Please check your store domain and access token."
      },
      { status: 200 }
    );
  }
}
