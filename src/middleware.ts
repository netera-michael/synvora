import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const response = NextResponse.next();

    // Security Headers
    const headers = response.headers;

    // 1. Strict-Transport-Security (HSTS)
    // Enforces HTTPS connections. Max-age is set to 2 years (63072000 seconds).
    // includeSubDomains applies this to all subdomains.
    // preload allows the domain to be included in browser HSTS preload lists.
    headers.set(
        "Strict-Transport-Security",
        "max-age=63072000; includeSubDomains; preload"
    );

    // 2. X-Content-Type-Options
    // Prevents the browser from MIME-sniffing a response away from the declared content-type.
    headers.set("X-Content-Type-Options", "nosniff");

    // 3. X-Frame-Options
    // Prevents the site from being embedded in iframes (clickjacking protection).
    // DENY: The page cannot be displayed in a frame, regardless of the site attempting to do so.
    headers.set("X-Frame-Options", "DENY");

    // 4. Referrer-Policy
    // Controls how much referrer information (sent via the Referer header) should be included with requests.
    // strict-origin-when-cross-origin: Send full referrer for same-origin, only origin for cross-origin, and no referrer for less secure requests (HTTPS -> HTTP).
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

    // 5. X-XSS-Protection
    // Enables the Cross-Site Scripting (XSS) filter built into most recent web browsers.
    // 1; mode=block: If a cross-site scripting attack is detected, the browser will stop the page from loading.
    headers.set("X-XSS-Protection", "1; mode=block");

    // 6. Content-Security-Policy (CSP)
    // A powerful allow-list of what can run on your site.
    // This is a basic stringent policy. You may need to relax it for scripts/styles you use (e.g., Google Analytics, stripe).
    // Getting this right is iterative.
    const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.shopify.com;
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https://cdn.shopify.com;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    block-all-mixed-content;
    upgrade-insecure-requests;
  `
        .replace(/\s{2,}/g, " ")
        .trim();

    headers.set("Content-Security-Policy", cspHeader);

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        "/((?!api|_next/static|_next/image|favicon.ico).*)",
    ],
};
