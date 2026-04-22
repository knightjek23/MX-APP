/**
 * ClaudeService — wraps Anthropic Sonnet 4.5 with the MX auditor prompt
 * and a structured-output tool use pattern.
 *
 * The AuditResultSchema (lib/types/audit.ts) is registered as the
 * input_schema of a tool called `submit_audit`, and tool_choice is
 * forced to that tool. The model returns a typed ToolUseBlock whose
 * `.input` matches our zod schema — no JSON string parsing, no fence
 * stripping, no preamble risk.
 *
 * We use Zod v4's native `z.toJSONSchema()` to convert the zod schema
 * to the JSON Schema shape Anthropic's tools API expects. No extra
 * dependency required (the older `zod-to-json-schema` library was
 * written for Zod v3 and doesn't understand v4's internal types).
 *
 * Cost accounting uses Sonnet 4.5's published rates. Revisit the
 * constants if Anthropic updates pricing.
 */

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { AuditResultSchema, type AuditResult } from "@/lib/types/audit";
import type { CompactFigmaTree } from "@/lib/types/figma";
import { MX_AUDITOR_PROMPT } from "@/lib/prompts/mx-auditor";
import { computeScore } from "@/lib/scoring";
import { logger } from "@/lib/logger";

// Sonnet 4.5 pricing — verified 2026-04. Revisit if Anthropic updates.
const COST_PER_INPUT_TOKEN = 3 / 1_000_000;
const COST_PER_OUTPUT_TOKEN = 15 / 1_000_000;
const MODEL = "claude-sonnet-4-5";
const MAX_TOKENS = 8192;

export class ClaudeNoToolUseError extends Error {
  constructor() {
    super(
      "The model returned text instead of calling submit_audit. This is rare but can happen under load — try again."
    );
    this.name = "ClaudeNoToolUseError";
  }
}

export class ClaudeRateLimitError extends Error {
  constructor() {
    super("Anthropic is rate-limited or overloaded. Wait a moment and try again.");
    this.name = "ClaudeRateLimitError";
  }
}

export class ClaudeValidationError extends Error {
  constructor(issues: string) {
    super(`Model output failed schema validation: ${issues}`);
    this.name = "ClaudeValidationError";
  }
}

export interface AuditMetrics {
  tokens_input: number;
  tokens_output: number;
  latency_ms: number;
  cost_usd: number;
  model: string;
}

export interface AuditOpts {
  fullFile: boolean;
  frameCount: number;
}

export class ClaudeService {
  private readonly client: Anthropic;

  constructor(apiKey: string) {
    if (!apiKey) throw new Error("Anthropic API key is required");
    this.client = new Anthropic({ apiKey });
  }

  async audit(
    tree: CompactFigmaTree,
    opts: AuditOpts
  ): Promise<AuditResult & AuditMetrics> {
    const start = Date.now();

    // Zod v4 native — converts the schema to JSON Schema (draft-7) in one call.
    // Anthropic's tools API accepts draft-7 JSON Schema as input_schema.
    const jsonSchema = z.toJSONSchema(AuditResultSchema, {
      target: "draft-7",
    }) as Record<string, unknown>;
    // Anthropic doesn't want the $schema metadata field on the tool input schema.
    delete jsonSchema.$schema;

    const auditTool = {
      name: "submit_audit",
      description: "Submit the MX audit for this Figma design.",
      input_schema: jsonSchema,
    };

    const userPayload = {
      scope: opts.fullFile ? "full-file" : "single-frame",
      frame_count: opts.frameCount,
      tree,
    };

    let response;
    try {
      response = await this.client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: MX_AUDITOR_PROMPT,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tools: [auditTool as any],
        tool_choice: { type: "tool", name: "submit_audit" },
        messages: [
          {
            role: "user",
            content: JSON.stringify(userPayload),
          },
        ],
      });
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 429 || status === 529) {
        throw new ClaudeRateLimitError();
      }
      throw err;
    }

    const latency_ms = Date.now() - start;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolBlock = (response.content as any[]).find(
      (b) => b && b.type === "tool_use"
    );
    if (!toolBlock) {
      logger.error("claude.audit.no_tool_use", {
        content_types: (response.content as Array<{ type?: string }>).map(
          (b) => b?.type
        ),
      });
      throw new ClaudeNoToolUseError();
    }

    const parsed = AuditResultSchema.safeParse(toolBlock.input);
    if (!parsed.success) {
      throw new ClaudeValidationError(parsed.error.message);
    }

    // Trust-but-verify: recompute the score server-side and prefer it if
    // the LLM and server disagree by more than 2 points.
    const { p1_count, p2_count, p3_count } = parsed.data.summary;
    const expected = computeScore(p1_count, p2_count, p3_count);
    if (Math.abs(expected - parsed.data.summary.overall_score) > 2) {
      logger.warn("claude.audit.score_divergence", {
        llm_score: parsed.data.summary.overall_score,
        server_score: expected,
      });
      parsed.data.summary.overall_score = expected;
    }

    const tokens_input = response.usage.input_tokens;
    const tokens_output = response.usage.output_tokens;
    const cost_usd = Number(
      (
        tokens_input * COST_PER_INPUT_TOKEN +
        tokens_output * COST_PER_OUTPUT_TOKEN
      ).toFixed(4)
    );

    logger.info("claude.audit.success", {
      latency_ms,
      tokens_input,
      tokens_output,
      cost_usd,
      scope: opts.fullFile ? "full-file" : "single-frame",
      frame_count: opts.frameCount,
      p1: p1_count,
      p2: p2_count,
      p3: p3_count,
    });

    return {
      ...parsed.data,
      tokens_input,
      tokens_output,
      latency_ms,
      cost_usd,
      model: MODEL,
    };
  }
}
