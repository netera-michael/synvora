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

module.exports = nextConfig;
