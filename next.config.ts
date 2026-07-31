import type { NextConfig } from "next";

/**
 * Security headers applied to every route.
 *
 * - X-Frame-Options: DENY        — no page needs to be iframed; blocks clickjacking
 *   (the audit share links are meant to be opened directly, not embedded).
 * - X-Content-Type-Options       — stops MIME-sniffing of responses.
 * - Referrer-Policy              — don't leak full URLs (audit slugs) to third parties.
 * - Permissions-Policy           — the app uses no camera/mic/geolocation.
 * - Strict-Transport-Security    — HTTPS only; Vercel serves HTTPS everywhere.
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
