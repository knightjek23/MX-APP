/**
 * POST /api/audit
 *
 * The whole Legible audit pipeline wrapped in a route handler:
 *   1. validate request body
 *   2. rate-limit by hashed IP (5/hr)
 *   3. parse Figma URL
 *   4. fetch file from Figma
 *   5. check frame count (reject if >50 full-file)
 *   6. compact the tree (throws if >120k tokens even after reduction)
 *   7. call Claude via tool-use
 *   8. persist to Supabase
 *   9. return shareable slug
 *
 * Each failure mode has its own typed error class and user-readable
 * HTTP response. Never leaks the Figma token in error messages or logs.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseFigmaUrl, FigmaUrlError } from "@/lib/validation/figma-url";
import {
  FigmaService,
  InvalidTokenError,
  FileNotFoundError,
  FigmaApiError,
} from "@/lib/services/figma";
import {
  ClaudeService,
  ClaudeRateLimitError,
  ClaudeNoToolUseError,
  ClaudeValidationError,
} from "@/lib/services/claude";
import { AuditService, AuditPersistError } from "@/lib/services/audit";
import { compactTree, countFrames, FileTooLargeError } from "@/lib/compact";
import { getSupabaseClient } from "@/lib/db/supabase";
import { getAuditRateLimit, hashIp, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const MAX_FRAMES = Number(process.env.AUDIT_MAX_FRAMES) || 50;

const RequestSchema = z.object({
  figma_url: z.string().min(1, "Figma URL is required."),
  figma_pat: z.string().min(1, "Figma token is required."),
  node_id: z.string().optional().nullable(),
});

class OversizedFileError extends Error {
  readonly frameCount: number;
  constructor(frameCount: number) {
    super(
      `This file has ${frameCount} frames. We can audit up to ${MAX_FRAMES} per run. Scope to a specific frame (right-click a frame in Figma → Copy link) or split the file into pages.`
    );
    this.name = "OversizedFileError";
    this.frameCount = frameCount;
  }
}

function errorResponse(status: number, message: string, code: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: NextRequest) {
  // 1. Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "Invalid JSON in request body.", "invalid_json");
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      400,
      parsed.error.issues[0]?.message ?? "Invalid request body.",
      "invalid_body"
    );
  }

  // 2. Rate limit by hashed IP
  const ip = getClientIp(request.headers);
  const ipHash = hashIp(ip);

  let rateLimit;
  try {
    rateLimit = await getAuditRateLimit().limit(ipHash);
  } catch (err) {
    logger.error("audit.route.ratelimit_failure", { error: String(err) });
    return errorResponse(
      503,
      "Rate limiter is unavailable. Try again in a moment.",
      "ratelimit_unavailable"
    );
  }

  if (!rateLimit.success) {
    const resetSeconds = Math.max(
      1,
      Math.ceil((rateLimit.reset - Date.now()) / 1000)
    );
    const resetMinutes = Math.ceil(resetSeconds / 60);
    return NextResponse.json(
      {
        error: {
          code: "rate_limited",
          message: `Rate limit reached — 5 audits per hour. Try again in ${resetMinutes} minute${resetMinutes === 1 ? "" : "s"}.`,
          retry_after_seconds: resetSeconds,
        },
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": rateLimit.limit.toString(),
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          "X-RateLimit-Reset": rateLimit.reset.toString(),
          "Retry-After": resetSeconds.toString(),
        },
      }
    );
  }

  const { figma_url, figma_pat, node_id } = parsed.data;

  try {
    // 3. Parse Figma URL
    const { fileId, nodeId: urlNodeId } = parseFigmaUrl(figma_url);
    const effectiveNodeId = node_id || urlNodeId || undefined;
    const scope: "full-file" | "single-frame" = effectiveNodeId
      ? "single-frame"
      : "full-file";

    // 4. Fetch file
    const figmaService = new FigmaService(figma_pat);
    const rawTree = await figmaService.fetchFile(fileId, effectiveNodeId);

    // 5. Frame count check (full-file only)
    const rawFrameCount = countFrames(rawTree);
    if (scope === "full-file" && rawFrameCount > MAX_FRAMES) {
      throw new OversizedFileError(rawFrameCount);
    }

    // 6. Compact (throws FileTooLargeError if still >120k tokens after reduction)
    const { tree, frameCount, compactedTokens, reductionPercent } =
      compactTree(rawTree);

    logger.info("audit.route.compacted", {
      fileId,
      nodeId: effectiveNodeId ?? null,
      scope,
      frameCount,
      compactedTokens,
      reductionPercent,
    });

    // 7. Run audit
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("Missing ANTHROPIC_API_KEY environment variable.");
    }
    const claudeService = new ClaudeService(apiKey);
    const audit = await claudeService.audit(tree, {
      fullFile: scope === "full-file",
      frameCount,
    });

    // 8. Persist
    const auditService = new AuditService(getSupabaseClient());
    const { slug } = await auditService.persist({
      figma_file_id: fileId,
      figma_node_id: effectiveNodeId ?? null,
      figma_url,
      scope,
      frame_count: frameCount,
      model: audit.model,
      latency_ms: audit.latency_ms,
      tokens_input: audit.tokens_input,
      tokens_output: audit.tokens_output,
      tokens_compacted: compactedTokens,
      cost_usd: audit.cost_usd,
      audit_json: {
        audit_version: audit.audit_version,
        scope: audit.scope,
        frames: audit.frames,
        entity_conflicts: audit.entity_conflicts,
        summary: audit.summary,
      },
      error: null,
      user_ip_hash: ipHash,
    });

    // 9. Return slug
    return NextResponse.json({ slug, audit_url: `/audit/${slug}` });
  } catch (err: unknown) {
    return handleError(err);
  }
}

function handleError(err: unknown): NextResponse {
  if (err instanceof FigmaUrlError) {
    return errorResponse(400, err.message, "invalid_figma_url");
  }
  if (err instanceof InvalidTokenError) {
    return errorResponse(401, err.message, "invalid_figma_token");
  }
  if (err instanceof FileNotFoundError) {
    return errorResponse(404, err.message, "file_not_found");
  }
  if (err instanceof FigmaApiError) {
    logger.error("audit.route.figma_api_error", { status: err.status });
    return errorResponse(
      502,
      "Figma's API returned an error. Try again in a moment.",
      "figma_api_error"
    );
  }
  if (err instanceof OversizedFileError) {
    return errorResponse(413, err.message, "file_too_many_frames");
  }
  if (err instanceof FileTooLargeError) {
    return errorResponse(413, err.message, "file_too_dense");
  }
  if (err instanceof ClaudeRateLimitError) {
    return errorResponse(503, err.message, "claude_rate_limited");
  }
  if (err instanceof ClaudeNoToolUseError) {
    return errorResponse(502, err.message, "claude_no_tool_use");
  }
  if (err instanceof ClaudeValidationError) {
    return errorResponse(502, err.message, "claude_validation_error");
  }
  if (err instanceof AuditPersistError) {
    logger.error("audit.route.persist_error", { message: err.message });
    return errorResponse(
      500,
      "Failed to save audit results. Try again.",
      "persist_error"
    );
  }

  logger.error("audit.route.unexpected", {
    error: err instanceof Error ? err.message : String(err),
    name: err instanceof Error ? err.name : "unknown",
  });
  return errorResponse(
    500,
    "Something went wrong. Try again.",
    "internal_error"
  );
}
