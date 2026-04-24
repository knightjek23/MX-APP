/**
 * Rate limiting for /api/audit — 5 requests per hour, sliding window,
 * keyed by SHA-256 hash of client IP.
 *
 * Why hash the IP:
 *   - Raw IPs are PII; hashing lets us rate-limit without storing them
 *   - The `user_ip_hash` column in the audits table stores the same hash
 *     so we can trace abuse without exposing the underlying IP
 *
 * Why Upstash (not in-memory):
 *   - Vercel serverless functions don't share memory across instances
 *   - Rate limit counters must live in shared storage to be effective
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { createHash } from "node:crypto";

const HASH_SALT = "legible-v1:";

export function hashIp(ip: string): string {
  return createHash("sha256").update(HASH_SALT + ip).digest("hex");
}

/**
 * Extract the client IP from a request's headers. Behind Vercel, real
 * client IPs arrive in `x-forwarded-for`. Locally, `x-real-ip` or an
 * "unknown" fallback keeps development working.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    // May be a comma-separated list; first entry is the original client.
    return forwarded.split(",")[0].trim();
  }
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

/**
 * Lazy-initialized rate limiter. Only opens the Redis connection on
 * first call, which means unit tests can import hashIp/getClientIp
 * without needing UPSTASH_REDIS_* env vars.
 */
let _auditRateLimit: Ratelimit | null = null;

export function getAuditRateLimit(): Ratelimit {
  if (!_auditRateLimit) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      throw new Error(
        "Missing UPSTASH_REDIS_URL or UPSTASH_REDIS_TOKEN. Rate limiting requires both."
      );
    }
    const redis = new Redis({ url, token });
    _auditRateLimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "1 h"),
      prefix: "legible:audit",
      analytics: true,
    });
  }
  return _auditRateLimit;
}
