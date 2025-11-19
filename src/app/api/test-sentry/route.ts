import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as Sentry from "@sentry/nextjs";

/**
 * Test endpoint to verify Sentry error tracking is working
 * This will intentionally throw an error that Sentry should capture
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    // Test 1: Capture a test exception
    Sentry.captureException(new Error("Sentry Test Error - This is a test error to verify Sentry is working correctly"), {
      tags: {
        test: "true",
        component: "test-sentry",
        environment: process.env.NODE_ENV || "unknown"
      },
      extra: {
        timestamp: new Date().toISOString(),
        user: session.user.email,
        sentryDsn: process.env.SENTRY_DSN ? "configured" : "not configured",
        publicDsn: process.env.NEXT_PUBLIC_SENTRY_DSN ? "configured" : "not configured"
      }
    });

    // Test 2: Capture a message
    Sentry.captureMessage("Sentry test message - Error tracking is working!", {
      level: "info",
      tags: {
        test: "true",
        type: "message"
      }
    });

    return NextResponse.json({
      success: true,
      message: "Test error sent to Sentry! Check your Sentry dashboard.",
      sentryConfigured: {
        serverDsn: !!process.env.SENTRY_DSN,
        clientDsn: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
        org: process.env.SENTRY_ORG || "not set",
        project: process.env.SENTRY_PROJECT || "not set"
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // If something goes wrong, capture that too
    Sentry.captureException(error);
    return NextResponse.json({
      success: false,
      message: "Failed to send test error",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

