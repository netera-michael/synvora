# Sentry Setup Guide

Sentry is configured and ready to use! Follow these steps to complete the setup.

## ✅ What's Already Done

- ✅ Sentry SDK installed (`@sentry/nextjs`)
- ✅ Configuration files created:
  - `sentry.client.config.ts` (client-side)
  - `sentry.server.config.ts` (server-side)
  - `sentry.edge.config.ts` (edge runtime)
  - `instrumentation.ts` (Next.js instrumentation)
- ✅ Error tracking added to Mercury API client
- ✅ Next.js config wrapped with Sentry

## 🔧 Required: Add Environment Variables

### For Vercel Deployment:

1. Go to your Vercel project: https://vercel.com/dashboard
2. Select your project → **Settings** → **Environment Variables**
3. Add these variables (for **Production**, **Preview**, and **Development**):

```
SENTRY_DSN=https://88f18b0eb8899a4f07186b68601849e7@o4510394312949760.ingest.de.sentry.io/4510394324484176
NEXT_PUBLIC_SENTRY_DSN=https://88f18b0eb8899a4f07186b68601849e7@o4510394312949760.ingest.de.sentry.io/4510394324484176
SENTRY_ORG=synvora
SENTRY_PROJECT=javascript-nextjs
```

### For Local Development:

Create a `.env.local` file in the project root:

```bash
SENTRY_DSN=https://88f18b0eb8899a4f07186b68601849e7@o4510394312949760.ingest.de.sentry.io/4510394324484176
NEXT_PUBLIC_SENTRY_DSN=https://88f18b0eb8899a4f07186b68601849e7@o4510394312949760.ingest.de.sentry.io/4510394324484176
SENTRY_ORG=synvora
SENTRY_PROJECT=javascript-nextjs
```

## 🚀 After Adding Environment Variables

1. **Redeploy** your Vercel project (or restart your local dev server)
2. **Test error tracking** by triggering an error (e.g., try syncing Mercury transactions)
3. **Check Sentry Dashboard**: https://synvora.sentry.io

## 📊 What Sentry Captures

- ✅ **API Errors**: Mercury API errors with full context
- ✅ **Network Errors**: Failed fetch requests
- ✅ **Stack Traces**: Full error stack traces
- ✅ **Request Context**: URLs, headers (sanitized), environment info
- ✅ **User Context**: User ID, email (if available)
- ✅ **Breadcrumbs**: User actions leading to errors

## 🔍 Viewing Errors

Visit your Sentry dashboard: **https://synvora.sentry.io**

You'll see:
- Error frequency and trends
- Full stack traces
- Request/response details
- Environment information
- User impact

## 🎯 Next Steps

1. Add environment variables to Vercel
2. Deploy the updated code
3. Test by triggering an error
4. Check Sentry dashboard for captured errors

## 💡 Tips

- **Free Plan**: 5,000 errors/month (plenty for development)
- **Alerts**: Set up email/Slack alerts in Sentry dashboard
- **Source Maps**: Already configured for better stack traces
- **Privacy**: Sensitive data (like API keys) is automatically sanitized

---

**Your Sentry Project**: [javascript-nextjs](https://synvora.sentry.io/projects/javascript-nextjs/)
**Organization**: synvora
**Region**: de.sentry.io (German region)

