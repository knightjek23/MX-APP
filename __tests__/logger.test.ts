import { describe, it, expect } from "vitest";
import { redact } from "@/lib/logger";

describe("redact", () => {
  it("redacts Figma PATs in strings", () => {
    const input = "request failed with token figd_abc123XYZ-_OK in body";
    expect(redact(input)).toBe(
      "request failed with token figd_[REDACTED] in body"
    );
  });

  it("redacts Bearer tokens in strings", () => {
    const input = "Authorization: Bearer sk-ant-api03-xxxxxxxxxxxxxx";
    expect(redact(input)).toBe("Authorization: Bearer [REDACTED]");
  });

  it("redacts fields named token, pat, apiKey, api_key, authorization, secret", () => {
    const obj = {
      token: "secret1",
      pat: "secret2",
      apiKey: "secret3",
      api_key: "secret4",
      authorization: "Bearer xyz",
      secretValue: "secret6",
      username: "josh",
      ok: true,
    };
    const out = redact(obj) as Record<string, unknown>;
    expect(out.token).toBe("[REDACTED]");
    expect(out.pat).toBe("[REDACTED]");
    expect(out.apiKey).toBe("[REDACTED]");
    expect(out.api_key).toBe("[REDACTED]");
    expect(out.authorization).toBe("[REDACTED]");
    expect(out.secretValue).toBe("[REDACTED]");
    expect(out.username).toBe("josh");
    expect(out.ok).toBe(true);
  });

  it("redacts PAT patterns nested inside object string values", () => {
    const obj = { log: "figd_deadbeef1234 leaked" };
    const out = redact(obj) as Record<string, unknown>;
    expect(out.log).toContain("figd_[REDACTED]");
    expect(out.log).not.toContain("deadbeef");
  });

  it("walks arrays and redacts entries inside", () => {
    const arr = ["safe", "figd_badvalue", { token: "x" }];
    const out = redact(arr) as unknown[];
    expect(out[0]).toBe("safe");
    expect(out[1]).toBe("figd_[REDACTED]");
    expect((out[2] as Record<string, unknown>).token).toBe("[REDACTED]");
  });

  it("passes through primitives unchanged", () => {
    expect(redact(42)).toBe(42);
    expect(redact(true)).toBe(true);
    expect(redact(null)).toBe(null);
    expect(redact(undefined)).toBe(undefined);
  });

  it("handles deeply nested structures", () => {
    const obj = {
      outer: {
        inner: {
          authorization: "Bearer leaked",
          body: "the pat was figd_abc",
        },
      },
    };
    const out = redact(obj) as {
      outer: { inner: { authorization: string; body: string } };
    };
    expect(out.outer.inner.authorization).toBe("[REDACTED]");
    expect(out.outer.inner.body).toContain("figd_[REDACTED]");
  });
});
