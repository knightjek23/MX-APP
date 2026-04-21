import { describe, it, expect } from "vitest";
import { parseFigmaUrl, FigmaUrlError } from "@/lib/validation/figma-url";

describe("parseFigmaUrl", () => {
  it("parses a standard /file/ URL", () => {
    const result = parseFigmaUrl("https://www.figma.com/file/ABC123/My-Design");
    expect(result).toEqual({ fileId: "ABC123" });
  });

  it("parses a /design/ URL", () => {
    const result = parseFigmaUrl("https://www.figma.com/design/XYZ789/Product-V2");
    expect(result).toEqual({ fileId: "XYZ789" });
  });

  it("handles the URL without a trailing slug segment", () => {
    const result = parseFigmaUrl("https://www.figma.com/file/ABC123");
    expect(result).toEqual({ fileId: "ABC123" });
  });

  it("accepts non-www variant", () => {
    const result = parseFigmaUrl("https://figma.com/file/ABC123/My-Design");
    expect(result.fileId).toBe("ABC123");
  });

  it("extracts nodeId from the current dash format and normalizes to colon", () => {
    const result = parseFigmaUrl(
      "https://www.figma.com/design/ABC123/My-Design?node-id=1-2"
    );
    expect(result).toEqual({ fileId: "ABC123", nodeId: "1:2" });
  });

  it("extracts nodeId from the legacy URL-encoded colon format", () => {
    const result = parseFigmaUrl(
      "https://www.figma.com/file/ABC123/My-Design?node-id=31%3A198"
    );
    expect(result).toEqual({ fileId: "ABC123", nodeId: "31:198" });
  });

  it("preserves additional query params without confusing node-id", () => {
    const result = parseFigmaUrl(
      "https://www.figma.com/design/ABC123/My-Design?t=abc&node-id=31-198&mode=dev"
    );
    expect(result).toEqual({ fileId: "ABC123", nodeId: "31:198" });
  });

  it("throws on an invalid host", () => {
    expect(() => parseFigmaUrl("https://example.com/file/ABC123/Stuff")).toThrow(
      FigmaUrlError
    );
  });

  it("throws on a non-file/non-design path (community etc.)", () => {
    expect(() =>
      parseFigmaUrl("https://www.figma.com/community/ABC123")
    ).toThrow(FigmaUrlError);
  });

  it("throws on empty input", () => {
    expect(() => parseFigmaUrl("")).toThrow(FigmaUrlError);
    expect(() => parseFigmaUrl("   ")).toThrow(FigmaUrlError);
  });

  it("trims surrounding whitespace before parsing", () => {
    const result = parseFigmaUrl(
      "   https://www.figma.com/file/ABC123/Stuff   "
    );
    expect(result.fileId).toBe("ABC123");
  });

  it("throws a user-readable error on malformed input", () => {
    try {
      parseFigmaUrl("not a url at all");
      throw new Error("Expected FigmaUrlError to be thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(FigmaUrlError);
      expect((e as FigmaUrlError).message).toMatch(/Figma/);
    }
  });
});
