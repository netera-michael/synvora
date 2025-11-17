export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/orders/:path*",
    "/api/shopify/:path*",
    "/api/payouts/:path*",
    "/api/venues/:path*",
    "/api/users/:path*",
    "/api/import/:path*"
  ]
};
