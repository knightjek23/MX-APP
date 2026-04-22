import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  FigmaService,
  InvalidTokenError,
  FileNotFoundError,
  FigmaApiError,
} from "@/lib/services/figma";

const originalFetch = global.fetch;

function mockFetchOnce(response: {
  ok: boolean;
  status: number;
  body?: unknown;
  text?: string;
}) {
  (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: response.ok,
    status: response.status,
    json: async () => response.body,
    text: async () => response.text ?? "",
  });
}

describe("FigmaService", () => {
  beforeEach(() => {
    global.fetch = vi.fn() as unknown as typeof fetch;
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("throws InvalidTokenError when constructed with an empty token", () => {
    expect(() => new FigmaService("")).toThrow(InvalidTokenError);
    expect(() => new FigmaService("   ")).toThrow(InvalidTokenError);
  });

  it("fetches a full file and returns the document node", async () => {
    mockFetchOnce({
      ok: true,
      status: 200,
      body: {
        document: { id: "0:0", name: "Doc", type: "DOCUMENT" },
      },
    });
    const svc = new FigmaService("figd_test_token_abc");
    const result = await svc.fetchFile("ABC123");
    expect(result.id).toBe("0:0");
    expect(global.fetch).toHaveBeenCalledOnce();
  });

  it("sends the X-Figma-Token header (and no PAT elsewhere)", async () => {
    mockFetchOnce({
      ok: true,
      status: 200,
      body: { document: { id: "0:0", name: "Doc", type: "DOCUMENT" } },
    });
    const svc = new FigmaService("figd_secret_abc");
    await svc.fetchFile("ABC123");
    const [, init] = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0];
    const headers = init.headers as Record<string, string>;
    expect(headers["X-Figma-Token"]).toBe("figd_secret_abc");
  });

  it("fetches a scoped node via /nodes endpoint when nodeId is provided", async () => {
    mockFetchOnce({
      ok: true,
      status: 200,
      body: {
        nodes: {
          "31:198": {
            document: { id: "31:198", name: "Dashboard", type: "FRAME" },
          },
        },
      },
    });
    const svc = new FigmaService("figd_test");
    const result = await svc.fetchFile("ABC123", "31:198");
    expect(result.id).toBe("31:198");
    const [url] = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(url).toContain("/nodes?ids=31%3A198");
    expect(url).toContain("depth=3");
  });

  it("throws InvalidTokenError on 401", async () => {
    mockFetchOnce({ ok: false, status: 401, text: "unauthorized" });
    const svc = new FigmaService("figd_bad");
    await expect(svc.fetchFile("ABC123")).rejects.toThrow(InvalidTokenError);
  });

  it("throws InvalidTokenError on 403", async () => {
    mockFetchOnce({ ok: false, status: 403, text: "forbidden" });
    const svc = new FigmaService("figd_bad");
    await expect(svc.fetchFile("ABC123")).rejects.toThrow(InvalidTokenError);
  });

  it("throws FileNotFoundError on 404", async () => {
    mockFetchOnce({ ok: false, status: 404, text: "not found" });
    const svc = new FigmaService("figd_good");
    await expect(svc.fetchFile("MISSING")).rejects.toThrow(FileNotFoundError);
  });

  it("throws FigmaApiError on 500", async () => {
    mockFetchOnce({ ok: false, status: 500, text: "internal error" });
    const svc = new FigmaService("figd_good");
    await expect(svc.fetchFile("ABC123")).rejects.toThrow(FigmaApiError);
  });

  it("throws FileNotFoundError when node endpoint returns no document entry", async () => {
    mockFetchOnce({
      ok: true,
      status: 200,
      body: { nodes: {} },
    });
    const svc = new FigmaService("figd_good");
    await expect(svc.fetchFile("ABC123", "99:99")).rejects.toThrow(
      FileNotFoundError
    );
  });
});
