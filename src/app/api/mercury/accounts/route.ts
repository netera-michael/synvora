import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MercuryClient } from "@/lib/mercury";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const settings = await prisma.mercurySettings.findFirst();
  if (!settings || !settings.apiKey) {
    return NextResponse.json(
      { message: "Mercury API key not configured" },
      { status: 400 }
    );
  }

  try {
    const client = new MercuryClient(settings.apiKey);
    const accounts = await client.getAccounts();
    
    return NextResponse.json({ accounts: accounts || [] });
  } catch (error) {
    console.error("Mercury accounts API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch accounts";
    return NextResponse.json(
      { message: errorMessage, accounts: [] },
      { status: 500 }
    );
  }
}

