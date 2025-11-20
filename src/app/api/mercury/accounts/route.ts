import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MercuryClient } from "@/lib/mercury";
import * as Sentry from "@sentry/nextjs";

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
    
    // Ensure Sentry events are flushed before returning
    await Sentry.flush(2000);
    
    return NextResponse.json({ accounts: accounts || [] });
  } catch (error) {
    console.error("Mercury accounts API error:", error);
    
    // Capture error in Sentry
    if (error instanceof Error) {
      Sentry.captureException(error, {
        tags: { component: "MercuryAccountsAPI" },
        extra: { hasApiKey: !!settings.apiKey }
      });
    }
    
    // Ensure Sentry events are flushed before returning
    await Sentry.flush(2000);
    
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch accounts";
    return NextResponse.json(
      { message: errorMessage, accounts: [] },
      { status: 500 }
    );
  }
}

