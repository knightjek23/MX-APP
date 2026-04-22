/**
 * GET /api/health
 *
 * Returns the current build SHA and reachability status for each
 * upstream dependency. Returns 200 when all three are "ok", else 503.
 *
 * Dependency checks:
 *   - supabase: SELECT id FROM audits LIMIT 1
 *   - figma: HEAD /v1/me (any HTTP response = API reachable; auth status
 *     doesn't matter for reachability)
 *   - claude: HEAD /v1/models (same logic as figma)
 *
 * None of these checks consume Anthropic tokens. Safe to ping frequently.
 */

import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/db/supabase";
import { logger } from "@/lib/logger";

async function checkSupabase(): Promise<"ok" | "err"> {
  try {
    const db = getSupabaseClient();
    const { error } = await db.from("audits").select("id").limit(1);
    return error ? "err" : "ok";
  } catch {
    return "err";
  }
}

async function checkFigma(): Promise<"ok" | "err"> {
  try {
    const response = await fetch("https://api.figma.com/v1/me", {
      method: "HEAD",
      // 5s timeout via AbortSignal — health check should be fast or fail
      signal: AbortSignal.timeout(5000),
    });
    return response.status > 0 ? "ok" : "err";
  } catch {
    return "err";
  }
}

async function checkClaude(): Promise<"ok" | "err"> {
  try {
    const response = await fetch("https://api.anthropic.com/v1/models", {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
    });
    return response.status > 0 ? "ok" : "err";
  } catch {
    return "err";
  }
}

export async function GET() {
  const [figma, claude, supabase] = await Promise.all([
    checkFigma(),
    checkClaude(),
    checkSupabase(),
  ]);

  const status = {
    sha: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
    figma,
    claude,
    supabase,
  };

  const allOk = figma === "ok" && claude === "ok" && supabase === "ok";
  if (!allOk) {
    logger.warn("health.check.degraded", status);
  }

  return NextResponse.json(status, { status: allOk ? 200 : 503 });
}
