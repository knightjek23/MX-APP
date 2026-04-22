import { describe, it, expect } from "vitest";
import {
  compactTree,
  countTokens,
  countFrames,
  FileTooLargeError,
} from "@/lib/compact";
import type { FigmaNode } from "@/lib/types/figma";

function node(overrides: Partial<FigmaNode>): FigmaNode {
  return { id: "0:1", name: "Node", type: "FRAME", ...overrides } as FigmaNode;
}

describe("compactTree", () => {
  it("strips geometry, effects, corner radius, exports, strokes", () => {
    const raw = node({
      id: "1:1",
      name: "Button",
      type: "FRAME",
      absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 40 },
      effects: [{ type: "DROP_SHADOW" }],
      cornerRadius: 8,
      exportSettings: [{ format: "PNG" }],
      strokes: [{ type: "SOLID", color: { r: 0, g: 0, b: 0, a: 1 } }],
    } as unknown as FigmaNode);

    const { tree } = compactTree(raw);
    expect(tree).not.toHaveProperty("absoluteBoundingBox");
    expect(tree).not.toHaveProperty("effects");
    expect(tree).not.toHaveProperty("cornerRadius");
    expect(tree).not.toHaveProperty("exportSettings");
    expect(tree).not.toHaveProperty("strokes");
    expect(tree.id).toBe("1:1");
    expect(tree.name).toBe("Button");
    expect(tree.type).toBe("FRAME");
  });

  it("preserves names, types, text content, and hierarchy", () => {
    const raw = node({
      id: "root",
      name: "Root",
      type: "CANVAS",
      children: [
        node({
          id: "1:1",
          name: "Title",
          type: "TEXT",
          characters: "Hello world",
        }),
      ],
    });
    const { tree } = compactTree(raw);
    expect(tree.name).toBe("Root");
    const children = tree.children as Array<Record<string, unknown>>;
    expect(children[0].name).toBe("Title");
    expect(children[0].characters).toBe("Hello world");
  });

  it("keeps semantic typography fields", () => {
    const raw = node({
      id: "1:1",
      type: "TEXT",
      characters: "Heading",
      style: { fontFamily: "Inter", fontSize: 24, fontWeight: 600 },
    });
    const { tree } = compactTree(raw);
    expect(tree.style).toEqual({
      fontFamily: "Inter",
      fontSize: 24,
      fontWeight: 600,
    });
  });

  it("converts primary solid fill to hex", () => {
    const raw = node({
      id: "1:1",
      type: "RECTANGLE",
      fills: [
        {
          type: "SOLID",
          color: { r: 1, g: 0, b: 0, a: 1 },
        },
      ],
    });
    const { tree } = compactTree(raw);
    expect(tree.fill).toBe("#ff0000");
  });

  it("flags image fills with hasImageFill", () => {
    const raw = node({
      id: "1:1",
      type: "RECTANGLE",
      fills: [{ type: "IMAGE", imageRef: "abc" }],
    });
    const { tree } = compactTree(raw);
    expect(tree.hasImageFill).toBe(true);
  });

  it("truncates text longer than 500 chars and appends ellipsis", () => {
    const raw = node({
      id: "1:1",
      type: "TEXT",
      characters: "x".repeat(800),
    });
    const { tree } = compactTree(raw);
    const text = tree.characters as string;
    expect(text.length).toBeLessThanOrEqual(501);
    expect(text.endsWith("\u2026")).toBe(true);
  });

  it("flattens single-child groups and records the original name", () => {
    const raw = node({
      id: "group",
      name: "WrapperGroup",
      type: "GROUP",
      children: [node({ id: "child", name: "Button", type: "FRAME" })],
    });
    const { tree } = compactTree(raw);
    expect(tree.type).toBe("FRAME");
    expect(tree.name).toBe("Button");
    expect(tree._flattenedFrom).toBe("WrapperGroup");
  });

  it("deduplicates repeated INSTANCE children of the same componentId", () => {
    const inst = (id: string) =>
      node({
        id,
        name: "StatCard",
        type: "INSTANCE",
        componentId: "comp:kpi",
      });
    const raw = node({
      id: "container",
      type: "FRAME",
      children: [inst("1:1"), inst("1:2"), inst("1:3"), inst("1:4")],
    });
    const { tree } = compactTree(raw);
    const children = tree.children as Array<Record<string, unknown>>;
    expect(children.length).toBe(1);
    expect(children[0]._instanceCount).toBe(4);
  });

  it("preserves single instances without the _instanceCount marker", () => {
    const raw = node({
      id: "container",
      type: "FRAME",
      children: [
        node({
          id: "1:1",
          type: "INSTANCE",
          componentId: "comp:one-of-a-kind",
        }),
      ],
    });
    const { tree } = compactTree(raw);
    const children = tree.children as Array<Record<string, unknown>>;
    expect(children.length).toBe(1);
    expect(children[0]._instanceCount).toBeUndefined();
  });

  it("reduces token count by 60%+ on a representative dashboard tree", () => {
    const raw = node({
      id: "root",
      name: "Dashboard",
      type: "FRAME",
      absoluteBoundingBox: { x: 0, y: 0, width: 1440, height: 900 },
      effects: Array(20).fill({
        type: "DROP_SHADOW",
        color: { r: 0, g: 0, b: 0, a: 0.1 },
        offset: { x: 0, y: 2 },
        radius: 4,
        visible: true,
      }),
      fills: [{ type: "SOLID", color: { r: 1, g: 1, b: 1, a: 1 } }],
      children: Array.from({ length: 10 }, (_, i) =>
        node({
          id: `1:${i}`,
          name: `Card ${i}`,
          type: "FRAME",
          absoluteBoundingBox: { x: 0, y: 0, width: 200, height: 100 },
          effects: [
            { type: "DROP_SHADOW", radius: 4, offset: { x: 0, y: 2 } },
          ],
          cornerRadius: 12,
          strokes: [{ type: "SOLID", color: { r: 0, g: 0, b: 0, a: 0.1 } }],
          strokeWeight: 1,
          children: [
            node({ id: `1:${i}:t`, type: "TEXT", characters: "Title" }),
          ],
        })
      ),
    } as unknown as FigmaNode);

    const { rawTokens, compactedTokens, reductionPercent } = compactTree(raw);
    expect(compactedTokens).toBeLessThan(rawTokens);
    expect(reductionPercent).toBeGreaterThanOrEqual(60);
  });

  it("throws FileTooLargeError when compacted tree exceeds 120k tokens", () => {
    // Build a huge, mostly-textual tree so even compaction can't save it.
    const bigText = "word ".repeat(200);
    const children = Array.from({ length: 3000 }, (_, i) =>
      node({
        id: `n:${i}`,
        name: `Node ${i}`,
        type: "TEXT",
        characters: bigText,
      })
    );
    const raw = node({ id: "root", type: "FRAME", children });
    expect(() => compactTree(raw)).toThrow(FileTooLargeError);
  });
});

describe("countFrames", () => {
  it("counts only FRAME descendants", () => {
    const raw = node({
      id: "root",
      type: "CANVAS",
      children: [
        node({ type: "FRAME" }),
        node({
          type: "FRAME",
          children: [node({ type: "FRAME" })],
        }),
        node({ type: "RECTANGLE" }),
      ],
    });
    expect(countFrames(raw)).toBe(3);
  });

  it("returns 0 for trees with no frames", () => {
    const raw = node({ type: "CANVAS", children: [node({ type: "TEXT" })] });
    expect(countFrames(raw)).toBe(0);
  });
});

describe("countTokens", () => {
  it("estimates ~1 token per 4 chars of JSON", () => {
    const obj = { a: "hello" };
    expect(countTokens(obj)).toBe(Math.ceil(JSON.stringify(obj).length / 4));
  });
});
