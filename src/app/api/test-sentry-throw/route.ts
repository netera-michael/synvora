import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as Sentry from "@sentry/nextjs";

/**
 * Test endpoint that actually throws an error to test Sentry auto-capture
 * This endpoint will return a 500 error, but Sentry should capture it automatically
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Set user context
  Sentry.setUser({
    id: session.user.id || undefined,
    email: session.user.email || undefined,
  });
  
  Sentry.setTag("test", "true");
  Sentry.setTag("component", "test-sentry-throw");
  
  // Actually throw an error - this should be auto-captured by Sentry
  throw new Error("Sentry Auto-Capture Test Error - This error was thrown and should be automatically captured by Sentry");
}

