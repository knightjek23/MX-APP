/**
 * Structured logger with PAT / Bearer token redaction.
 *
 * Security-critical: every log line passes through redact() so a stray
 * PAT in an error message or metadata object can never reach stdout,
 * Vercel logs, or eventual Sentry payloads.
 *
 * Keep this simple — console.log wrapped in JSON. Swap for Pino later
 * if we need structured queryability beyond what Vercel's log UI offers.
 */

const FIGMA_PAT_RE = /figd_[A-Za-z0-9_-]+/g;
const BEARER_RE = /(Bearer\s+)[^\s"']+/g;

// Field names that always hold secrets — redact regardless of content.
const SECRET_KEY_RE = /token|pat|authorization|api[_-]?key|secret/i;

export function redact(value: unknown): unknown {
  if (typeof value === "string") {
    return value
      .replace(FIGMA_PAT_RE, "figd_[REDACTED]")
      .replace(BEARER_RE, "$1[REDACTED]");
  }
  if (Array.isArray(value)) {
    return value.map(redact);
  }
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      if (SECRET_KEY_RE.test(key)) {
        result[key] = "[REDACTED]";
      } else {
        result[key] = redact(val);
      }
    }
    return result;
  }
  return value;
}

export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

function emit(level: "info" | "warn" | "error", message: string, meta: Record<string, unknown>) {
  const redacted = redact(meta) as Record<string, unknown>;
  const line = JSON.stringify({ level, ts: new Date().toISOString(), message, ...redacted });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger: Logger = {
  info(message, meta = {}) {
    emit("info", message, meta);
  },
  warn(message, meta = {}) {
    emit("warn", message, meta);
  },
  error(message, meta = {}) {
    emit("error", message, meta);
  },
};
