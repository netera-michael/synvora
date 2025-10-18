export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/", "/orders/:path*", "/api/orders/:path*", "/api/shopify/:path*"]
};
