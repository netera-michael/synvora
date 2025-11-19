// Injected content via Sentry wizard below

const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: undefined,
  reactStrictMode: true,
  experimental: {
    typedRoutes: true
  },
  async redirects() {
    return [
      // Redirect old routes to new /admin routes for backward compatibility
      {
        source: '/login',
        destination: '/admin/login',
        permanent: true,
      },
      {
        source: '/orders',
        destination: '/admin/orders',
        permanent: true,
      },
      {
        source: '/products',
        destination: '/admin/products',
        permanent: true,
      },
      {
        source: '/analytics',
        destination: '/admin/analytics',
        permanent: true,
      },
      {
        source: '/customers',
        destination: '/admin/customers',
        permanent: true,
      },
      {
        source: '/settings',
        destination: '/admin/settings',
        permanent: true,
      },
      {
        source: '/settings/:path*',
        destination: '/admin/settings/:path*',
        permanent: true,
      },
      {
        source: '/finance/:path*',
        destination: '/admin/finance/:path*',
        permanent: true,
      },
    ];
  },
};

module.exports = withSentryConfig(
  nextConfig,
  {
    // For all available options, see:
    // https://github.com/getsentry/sentry-webpack-plugin#options

    // Suppresses source map uploading logs during build
    silent: true,
    org: process.env.SENTRY_ORG || "synvora",
    project: process.env.SENTRY_PROJECT || "javascript-nextjs",
  },
  {
    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-configuration/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Transpiles SDK to be compatible with IE11 (increases bundle size)
    transpileClientSDK: true,

    // Routes browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
    // This can increase your server load as well as your hosting bill.
    // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
    // side errors will fail.
    tunnelRoute: "/monitoring",

    // Hides source maps from generated client bundles
    hideSourceMaps: true,

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,

    // Enables automatic instrumentation of Vercel Cron Monitors.
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,
  }
);
