import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as Sentry from "@sentry/nextjs";

/**
 * Test endpoint that actually throws an error to test Sentry auto-capture
 * This endpoint will return a 500 error, but Sentry should capture it automatically
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Ensure Sentry is initialized
    await import("../../../sentry.server.config");

    // Set user context
    Sentry.setUser({
      id: session.user.id || undefined,
      email: session.user.email || undefined,
    });
    
    Sentry.setTag("test", "true");
    Sentry.setTag("component", "test-sentry-throw");
    
    console.log("[Sentry Throw Test] About to throw error...");
    
    // Actually throw an error - this should be auto-captured by Sentry
    const error = new Error("Sentry Auto-Capture Test Error - This error was thrown and should be automatically captured by Sentry");
    error.name = "SentryAutoCaptureTestError";
    
    // Capture the error before throwing
    Sentry.captureException(error, {
      tags: {
        test: "true",
        component: "test-sentry-throw",
        autoCapture: "true"
      }
    });
    
    // Flush before throwing
    console.log("[Sentry Throw Test] Flushing before throw...");
    await Sentry.flush(2000);
    
    // Now throw it
    throw error;
  } catch (error) {
    // Capture the error in the catch block too
    console.log("[Sentry Throw Test] Error caught:", error instanceof Error ? error.message : "Unknown error");
    Sentry.captureException(error, {
      tags: {
        test: "true",
        component: "test-sentry-throw",
        caught: "true"
      }
    });
    
    // Flush again
    await Sentry.flush(2000);
    
    // Return error response
    return NextResponse.json(
      { 
        error: "Test error thrown",
        message: error instanceof Error ? error.message : "Unknown error",
        note: "This error should appear in Sentry"
      },
      { status: 500 }
    );
  }
}

