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

const decodePathParam = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const resolveLegacyRedirect = (url: URL): URL | null => {
  if (url.pathname === "/app/profile") {
    const nextUrl = new URL(url.toString());
    nextUrl.pathname = "/profile";
    return nextUrl.href === url.href ? null : nextUrl;
  }

  if (url.searchParams.has("showId")) {
    const showId = url.searchParams.get("showId");
    const nextUrl = new URL(url.toString());
    nextUrl.searchParams.delete("showId");
    if (showId) {
      nextUrl.searchParams.set("id", showId);
    }
    nextUrl.pathname = "/show";
    return nextUrl.href === url.href ? null : nextUrl;
  }

  if (url.pathname === "/app" && url.searchParams.has("id")) {
    const nextUrl = new URL(url.toString());
    nextUrl.pathname = "/show";
    return nextUrl.href === url.href ? null : nextUrl;
  }

  if (url.pathname.startsWith("/app/show/")) {
    const [, , , rawShowId] = url.pathname.split("/");
    if (!rawShowId) {
      return null;
    }
    const showId = decodePathParam(rawShowId);
    if (!showId) {
      return null;
    }
    const nextUrl = new URL(url.toString());
    nextUrl.pathname = "/show";
    nextUrl.search = "";
    nextUrl.searchParams.set("id", showId);
    return nextUrl.href === url.href ? null : nextUrl;
  }

  if (url.pathname.startsWith("/show/")) {
    const [, , rawShowId] = url.pathname.split("/");
    if (!rawShowId) {
      return null;
    }
    const showId = decodePathParam(rawShowId);
    if (!showId) {
      return null;
    }
    const nextUrl = new URL(url.toString());
    nextUrl.pathname = "/show";
    nextUrl.searchParams.set("id", showId);
    return nextUrl.href === url.href ? null : nextUrl;
  }

  return null;
};

export const onRequest: MiddlewareHandler = async (context, next) => {
  const url = new URL(context.request.url);

  const legacyRedirect = resolveLegacyRedirect(url);
  if (legacyRedirect) {
    return context.redirect(legacyRedirect.toString(), 308);
  }

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
