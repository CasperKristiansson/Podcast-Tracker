import type { MiddlewareHandler } from "astro";

const cspDirectives = [
  "default-src 'self'",
  "connect-src 'self' https:",
  "img-src 'self' data: https:",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
];

const CONTENT_SECURITY_POLICY = cspDirectives.join("; ");
const STRICT_TRANSPORT_SECURITY =
  "max-age=63072000; includeSubDomains; preload";
const PERMISSIONS_POLICY = "geolocation=(), microphone=(), camera=()";

export const onRequest: MiddlewareHandler = async (context, next) => {
  const response = await next();

  response.headers.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
  response.headers.set("Strict-Transport-Security", STRICT_TRANSPORT_SECURITY);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Permissions-Policy", PERMISSIONS_POLICY);
  response.headers.set("X-XSS-Protection", "1; mode=block");

  return response;
};
