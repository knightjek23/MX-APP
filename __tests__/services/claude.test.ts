import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Anthropic SDK before importing ClaudeService so the mocked
// constructor is the one ClaudeService picks up.
const mockCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: mockCreate };
  },
}));

import {
  ClaudeService,
  ClaudeNoToolUseError,
  ClaudeRateLimitError,
  ClaudeValidationError,
} from "@/lib/services/claude";

const validAuditOutput = {
  audit_version: "v1",
  scope: "single-frame",
  frames: [
    {
      node_id: "31:198",
      name: "Dashboard",
      annotations: [
        {
          priority: "P1",
          category: "semantic_html",
          design_recommendation:
            "Treat this clickable element as a Button component, not a styled rectangle. Apply your design system's Button pattern and document for handoff that this is interactive.",
          design_rationale:
            "AI agents only recognize elements they can identify as interactive. A styled rectangle reads as decorative content — agents skip it or click in the wrong place.",
          recommendation:
            "Use a <button> element for the clickable div currently styled as a button. Native semantics are required for agents to identify it as interactive.",
          rationale:
            "Agents rely on the accessibility tree to find interactive elements. A styled div has no role and will be skipped.",
          code_hint: '<button type="button">Click me</button>',
        },
      ],
    },
  ],
  entity_conflicts: [],
  summary: {
    p1_count: 1,
    p2_count: 0,
    p3_count: 0,
    overall_score: 88,
  },
};

const sampleTree = { id: "31:198", name: "Dashboard", type: "FRAME" } as any;

describe("ClaudeService", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("returns parsed audit + metrics on happy path", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [
        { type: "tool_use", name: "submit_audit", input: validAuditOutput },
      ],
      usage: { input_tokens: 1000, output_tokens: 500 },
    });

    const svc = new ClaudeService("sk-ant-test");
    const result = await svc.audit(sampleTree, {
      fullFile: false,
      frameCount: 1,
    });

    expect(result.summary.p1_count).toBe(1);
    expect(result.tokens_input).toBe(1000);
    expect(result.tokens_output).toBe(500);
    expect(result.model).toBe("claude-sonnet-4-5");
    expect(result.cost_usd).toBeGreaterThan(0);
    expect(result.latency_ms).toBeGreaterThanOrEqual(0);
  });

  it("forces tool_choice to submit_audit with the correct tool registered", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [
        { type: "tool_use", name: "submit_audit", input: validAuditOutput },
      ],
      usage: { input_tokens: 100, output_tokens: 50 },
    });

    const svc = new ClaudeService("sk-ant-test");
    await svc.audit(sampleTree, { fullFile: true, frameCount: 3 });

    expect(mockCreate).toHaveBeenCalledOnce();
    const args = mockCreate.mock.calls[0][0];
    expect(args.tool_choice).toEqual({ type: "tool", name: "submit_audit" });
    expect(args.tools).toHaveLength(1);
    expect(args.tools[0].name).toBe("submit_audit");
  });

  it("passes scope + frame_count in the user payload", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [
        { type: "tool_use", name: "submit_audit", input: validAuditOutput },
      ],
      usage: { input_tokens: 100, output_tokens: 50 },
    });

    const svc = new ClaudeService("sk-ant-test");
    await svc.audit(sampleTree, { fullFile: true, frameCount: 12 });

    const args = mockCreate.mock.calls[0][0];
    const userMessage = args.messages[0].content as string;
    const parsed = JSON.parse(userMessage);
    expect(parsed.scope).toBe("full-file");
    expect(parsed.frame_count).toBe(12);
  });

  it("throws ClaudeNoToolUseError when the response is text instead of a tool call", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "I cannot do that." }],
      usage: { input_tokens: 100, output_tokens: 20 },
    });
    const svc = new ClaudeService("sk-ant-test");
    await expect(
      svc.audit(sampleTree, { fullFile: false, frameCount: 1 })
    ).rejects.toThrow(ClaudeNoToolUseError);
  });

  it("throws ClaudeRateLimitError on 429", async () => {
    const err = Object.assign(new Error("rate limited"), { status: 429 });
    mockCreate.mockRejectedValueOnce(err);
    const svc = new ClaudeService("sk-ant-test");
    await expect(
      svc.audit(sampleTree, { fullFile: false, frameCount: 1 })
    ).rejects.toThrow(ClaudeRateLimitError);
  });

  it("throws ClaudeRateLimitError on 529 (overloaded)", async () => {
    const err = Object.assign(new Error("overloaded"), { status: 529 });
    mockCreate.mockRejectedValueOnce(err);
    const svc = new ClaudeService("sk-ant-test");
    await expect(
      svc.audit(sampleTree, { fullFile: false, frameCount: 1 })
    ).rejects.toThrow(ClaudeRateLimitError);
  });

  it("throws ClaudeValidationError when tool input fails zod validation", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: "tool_use",
          name: "submit_audit",
          input: {
            audit_version: "v1",
            scope: "single-frame",
            frames: "not an array", // invalid
            entity_conflicts: [],
            summary: {
              p1_count: 0,
              p2_count: 0,
              p3_count: 0,
              overall_score: 100,
            },
          },
        },
      ],
      usage: { input_tokens: 100, output_tokens: 20 },
    });
    const svc = new ClaudeService("sk-ant-test");
    await expect(
      svc.audit(sampleTree, { fullFile: false, frameCount: 1 })
    ).rejects.toThrow(ClaudeValidationError);
  });

  it("recomputes score server-side and overrides LLM output when they diverge", async () => {
    const outputWithWrongScore = {
      ...validAuditOutput,
      summary: {
        p1_count: 1,
        p2_count: 0,
        p3_count: 0,
        overall_score: 42, // wrong — should be 88
      },
    };
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: "tool_use",
          name: "submit_audit",
          input: outputWithWrongScore,
        },
      ],
      usage: { input_tokens: 100, output_tokens: 50 },
    });
    const svc = new ClaudeService("sk-ant-test");
    const result = await svc.audit(sampleTree, {
      fullFile: false,
      frameCount: 1,
    });
    expect(result.summary.overall_score).toBe(88);
  });
});
