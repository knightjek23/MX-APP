/**
 * Rate limiting for /api/audit — per-user sliding window via Upstash.
 *
 * Before auth landed (Week 1): 5 audits/hour per IP, keyed by SHA-256 hash.
 * After auth (Week 1.5+): 20 audits/hour per Clerk user_id, configurable
 * via the AUDIT_RATE_LIMIT_PER_HOUR env var. IP-hash helpers stay in this
 * module for defense-in-depth — the route still records user_ip_hash on
 * each audit row to support cross-account abuse detection.
 *
 * Why Upstash (not in-memory):
 *   - Vercel serverless functions don't share memory across instances
 *   - Rate limit counters must live in shared storage to be effective
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { createHash } from "node:crypto";

const HASH_SALT = "legible-v1:";
const DEFAULT_RATE_LIMIT_PER_HOUR = 20;

export function hashIp(ip: string): string {
  return createHash("sha256").update(HASH_SALT + ip).digest("hex");
}

/**
 * Build the Upstash key for per-user rate limiting. Prefixed with `user:`
 * so we can tell user-scoped keys apart from any future IP-scoped keys
 * sharing the same Redis namespace.
 */
export function auditRateLimitKey(userId: string): string {
  return `user:${userId}`;
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
 * first call, which means unit tests can import hashIp/getClientIp/
 * auditRateLimitKey without needing UPSTASH_REDIS_* env vars.
 */
let _auditRateLimit: Ratelimit | null = null;

export function getAuditRateLimit(): Ratelimit {
  if (!_auditRateLimit) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      throw new Error(
        "Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN. Rate limiting requires both."
      );
    }
    const perHour = Number(process.env.AUDIT_RATE_LIMIT_PER_HOUR) ||
      DEFAULT_RATE_LIMIT_PER_HOUR;
    const redis = new Redis({ url, token });
    _auditRateLimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(perHour, "1 h"),
      prefix: "legible:audit",
      analytics: true,
    });
  }
  return _auditRateLimit;
}
