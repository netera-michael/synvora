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

  // Check if Sentry is initialized
  const sentryDsn = process.env.SENTRY_DSN;
  const isSentryInitialized = Sentry.getCurrentHub().getClient() !== undefined;

  try {
    // Test 1: Actually throw an error (this will be auto-captured by Sentry)
    const testError = new Error("Sentry Test Error - This is a test error to verify Sentry is working correctly");
    testError.name = "SentryTestError";
    
    // Add context before throwing
    Sentry.setUser({
      id: session.user.id || undefined,
      email: session.user.email || undefined,
    });
    
    Sentry.setTag("test", "true");
    Sentry.setTag("component", "test-sentry");
    Sentry.setContext("test_context", {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "unknown",
      sentryDsnConfigured: !!sentryDsn,
      sentryInitialized: isSentryInitialized,
    });

    // Test 2: Capture a message first
    Sentry.captureMessage("Sentry test message - Error tracking is working!", {
      level: "info",
      tags: {
        test: "true",
        type: "message"
      }
    });

    // Test 3: Capture exception
    Sentry.captureException(testError, {
      tags: {
        test: "true",
        component: "test-sentry",
        environment: process.env.NODE_ENV || "unknown"
      },
      extra: {
        timestamp: new Date().toISOString(),
        user: session.user.email,
        sentryDsn: sentryDsn ? "configured" : "not configured",
        sentryInitialized: isSentryInitialized,
      }
    });

    // Test 4: Actually throw an error (this should be auto-captured)
    // Uncomment the line below to test auto-capture:
    // throw testError;

    // Flush events to ensure they're sent before the response
    await Sentry.flush(3000); // Wait up to 3 seconds for events to be sent

    return NextResponse.json({
      success: true,
      message: "Test error sent to Sentry! Check your Sentry dashboard.",
      sentryConfigured: {
        serverDsn: !!sentryDsn,
        clientDsn: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
        org: process.env.SENTRY_ORG || "not set",
        project: process.env.SENTRY_PROJECT || "not set",
        sentryInitialized: isSentryInitialized,
        dsnPreview: sentryDsn ? `${sentryDsn.substring(0, 20)}...` : "not set"
      },
      timestamp: new Date().toISOString(),
      note: "If events don't appear in Sentry, check: 1) DSN format in Vercel env vars, 2) Network connectivity from Vercel to Sentry, 3) Sentry project settings"
    });
  } catch (error) {
    // If something goes wrong, capture that too
    Sentry.captureException(error);
    await Sentry.flush(2000);
    return NextResponse.json({
      success: false,
      message: "Failed to send test error",
      error: error instanceof Error ? error.message : "Unknown error",
      sentryInitialized: isSentryInitialized
    }, { status: 500 });
  }
}

