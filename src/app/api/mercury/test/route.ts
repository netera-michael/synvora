import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MercuryClient } from "@/lib/mercury";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const apiKey = body.apiKey;

  if (!apiKey) {
    return NextResponse.json(
      { message: "API key is required" },
      { status: 400 }
    );
  }

  try {
    const client = new MercuryClient(apiKey);
    const connected = await client.testConnection();
    
    if (connected) {
      const accounts = await client.getAccounts();
      return NextResponse.json({
        success: true,
        message: "Connection successful",
        accountsCount: accounts.length
      });
    } else {
      return NextResponse.json(
        { success: false, message: "Connection failed" },
        { status: 400 }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Connection failed";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 400 }
    );
  }
}

