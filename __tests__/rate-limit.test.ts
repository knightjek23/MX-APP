import { describe, it, expect } from "vitest";
import { hashIp, getClientIp } from "@/lib/rate-limit";

describe("hashIp", () => {
  it("produces a 64-char hex SHA-256 digest", () => {
    const hash = hashIp("203.0.113.42");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is deterministic for the same input", () => {
    expect(hashIp("203.0.113.42")).toBe(hashIp("203.0.113.42"));
  });

  it("produces different hashes for different IPs", () => {
    expect(hashIp("203.0.113.42")).not.toBe(hashIp("203.0.113.43"));
    expect(hashIp("203.0.113.42")).not.toBe(hashIp("1.1.1.1"));
  });

  it("handles IPv6 addresses", () => {
    const hash = hashIp("2001:0db8:85a3::8a2e:0370:7334");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("getClientIp", () => {
  it("returns the first IP in x-forwarded-for", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.42, 10.0.0.1, 172.16.0.1",
    });
    expect(getClientIp(headers)).toBe("203.0.113.42");
  });

  it("trims whitespace around forwarded IPs", () => {
    const headers = new Headers({
      "x-forwarded-for": "  203.0.113.42  , 10.0.0.1",
    });
    expect(getClientIp(headers)).toBe("203.0.113.42");
  });

  it("falls back to x-real-ip when x-forwarded-for is missing", () => {
    const headers = new Headers({ "x-real-ip": "198.51.100.7" });
    expect(getClientIp(headers)).toBe("198.51.100.7");
  });

  it("prefers x-forwarded-for over x-real-ip when both are present", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.42",
      "x-real-ip": "198.51.100.7",
    });
    expect(getClientIp(headers)).toBe("203.0.113.42");
  });

  it("returns 'unknown' when no IP headers are set", () => {
    expect(getClientIp(new Headers())).toBe("unknown");
  });
});
