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
  // Check if DSN is configured (Sentry will auto-initialize if DSN is set)
  const isSentryInitialized = !!sentryDsn;

  try {
    // Sentry is already initialized via instrumentation.ts
    // No need to manually import - it's auto-loaded by Next.js
    
    // Test 1: Actually throw an error (this will be auto-captured by Sentry)
    const testError = new Error("Sentry Test Error - This is a test error to verify Sentry is working correctly");
    testError.name = "SentryTestError";
    
    console.log("[Sentry Test] About to capture events, DSN:", sentryDsn ? "configured" : "not configured");
    
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
    });

    // Test 2: Capture a message first
    console.log("[Sentry Test] Capturing message...");
    const messageId = Sentry.captureMessage("Sentry test message - Error tracking is working!", {
      level: "info",
      tags: {
        test: "true",
        type: "message"
      }
    });
    console.log("[Sentry Test] Message captured with ID:", messageId);

    // Test 3: Capture exception
    console.log("[Sentry Test] Capturing exception...");
    const exceptionId = Sentry.captureException(testError, {
      tags: {
        test: "true",
        component: "test-sentry",
        environment: process.env.NODE_ENV || "unknown"
      },
      extra: {
        timestamp: new Date().toISOString(),
        user: session.user.email,
        sentryDsn: sentryDsn ? "configured" : "not configured",
      }
    });
    console.log("[Sentry Test] Exception captured with ID:", exceptionId);

    // Test 4: Actually throw an error (this should be auto-captured by Sentry)
    // This will be caught by Next.js error boundary and Sentry should capture it
    // Uncomment to test: throw testError;

    // Flush events to ensure they're sent before the response
    console.log("[Sentry Test] Flushing events...");
    console.log("[Sentry Test] DSN configured:", !!sentryDsn);
    console.log("[Sentry Test] DSN preview:", sentryDsn ? `${sentryDsn.substring(0, 40)}...` : "not set");
    
    // Try multiple flush attempts with increasing timeouts
    let flushResult = false;
    for (let i = 0; i < 3; i++) {
      console.log(`[Sentry Test] Flush attempt ${i + 1}/3...`);
      flushResult = await Sentry.flush(2000);
      if (flushResult) {
        console.log(`[Sentry Test] Flush succeeded on attempt ${i + 1}`);
        break;
      }
      console.log(`[Sentry Test] Flush failed on attempt ${i + 1}, waiting...`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    console.log("[Sentry Test] Final flush result:", flushResult);

    return NextResponse.json({
      success: true,
      message: "Test error sent to Sentry! Check your Sentry dashboard.",
      sentryConfigured: {
        serverDsn: !!sentryDsn,
        clientDsn: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
        org: process.env.SENTRY_ORG || "not set",
        project: process.env.SENTRY_PROJECT || "not set",
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
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

