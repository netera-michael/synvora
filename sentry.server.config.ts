// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;

// Only initialize if DSN is provided
if (dsn) {
  Sentry.init({
    dsn,

    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: 1,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: true, // Temporarily enabled for testing

    // Environment
    environment: process.env.NODE_ENV || "production",

    // Release tracking
    release: process.env.VERCEL_GIT_COMMIT_SHA || undefined,

    // Ensure events are sent even in serverless environments
    beforeSend(event, hint) {
      // Log to console for debugging
      console.log("[Sentry] Attempting to send event:", {
        message: event.message,
        level: event.level,
        tags: event.tags,
        dsnConfigured: !!dsn,
        eventId: event.event_id,
        timestamp: event.timestamp,
      });
      // Always return event (don't filter it out)
      return event;
    },
    
    // Ensure transport is configured for serverless
    transportOptions: {
      // Increase timeout for serverless environments
      timeout: 10000,
    },

    // Uncomment the line below to enable Spotlight (https://spotlightjs.com)
    // spotlight: process.env.NODE_ENV === 'development',
  });
  
  console.log("[Sentry] Initialized with DSN:", dsn ? `${dsn.substring(0, 30)}...` : "not configured");
} else {
  console.warn("[Sentry] DSN not configured - Sentry will not capture errors");
}

