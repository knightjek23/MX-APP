/**
 * Figma tree compaction.
 *
 * Takes a raw Figma REST API response tree and reduces it to the semantic
 * fields Legible's MX auditor actually needs. Target: 70% token reduction.
 *
 * See PROJECT.md §3.1 for the full keep / strip rule list.
 */

import type { FigmaNode, FigmaPaint, CompactFigmaTree } from "@/lib/types/figma";

export class FileTooLargeError extends Error {
  readonly tokens: number;
  constructor(tokens: number) {
    super(
      `This file is too dense to audit in a single run (${tokens.toLocaleString()} tokens, max 120,000). Scope to a specific frame or split the file into pages.`
    );
    this.name = "FileTooLargeError";
    this.tokens = tokens;
  }
}

export interface CompactionResult {
  tree: CompactFigmaTree;
  frameCount: number;
  rawTokens: number;
  compactedTokens: number;
  reductionPercent: number;
  warnings: string[];
}

const MAX_TEXT_LENGTH = 500;
const WARN_TOKEN_THRESHOLD = 80_000;
const MAX_TOKEN_THRESHOLD = 120_000;

/**
 * Cheap token estimator: ~1 token per 4 chars of JSON.
 * Good enough for budget gating — we're not billing on this estimate.
 */
export function countTokens(tree: unknown): number {
  return Math.ceil(JSON.stringify(tree).length / 4);
}

function paintToHex(paint: FigmaPaint | undefined): string | undefined {
  if (!paint || paint.type !== "SOLID" || !paint.color) return undefined;
  const { r, g, b } = paint.color;
  const byte = (n: number) => Math.round(n * 255).toString(16).padStart(2, "0");
  return `#${byte(r)}${byte(g)}${byte(b)}`;
}

function primaryFill(fills?: FigmaPaint[]): string | undefined {
  if (!fills) return undefined;
  const visible = fills.find((f) => f.visible !== false && f.type !== "IMAGE");
  return paintToHex(visible);
}

function hasImageFill(fills?: FigmaPaint[]): boolean {
  return fills?.some((f) => f.type === "IMAGE") ?? false;
}

/**
 * Compact a single node — strip geometry, effects, exports; keep semantics.
 */
function compactNode(node: FigmaNode): Record<string, unknown> {
  const out: Record<string, unknown> = {
    id: node.id,
    name: node.name,
    type: node.type,
  };

  if (node.visible === false) out.visible = false;
  if (typeof node.opacity === "number" && node.opacity < 1) {
    out.opacity = Number(node.opacity.toFixed(2));
  }

  if (typeof node.characters === "string") {
    out.characters =
      node.characters.length > MAX_TEXT_LENGTH
        ? node.characters.slice(0, MAX_TEXT_LENGTH) + "\u2026"
        : node.characters;
  }

  if (node.style) {
    const style: Record<string, unknown> = {};
    if (node.style.fontFamily) style.fontFamily = node.style.fontFamily;
    if (node.style.fontSize) style.fontSize = node.style.fontSize;
    if (node.style.fontWeight) style.fontWeight = node.style.fontWeight;
    if (Object.keys(style).length > 0) out.style = style;
  }

  const fill = primaryFill(node.fills);
  if (fill) out.fill = fill;
  if (hasImageFill(node.fills)) out.hasImageFill = true;

  if (node.layoutMode && node.layoutMode !== "NONE") {
    out.layoutMode = node.layoutMode;
  }

  if (node.componentId) out.componentId = node.componentId;

  return out;
}

/** GROUP with exactly one child → collapse into the child. */
function shouldFlatten(node: FigmaNode): boolean {
  return (
    node.type === "GROUP" &&
    Array.isArray(node.children) &&
    node.children.length === 1
  );
}

function compactTreeRecursive(node: FigmaNode): Record<string, unknown> {
  if (shouldFlatten(node) && node.children) {
    const inner = compactTreeRecursive(node.children[0]);
    inner._flattenedFrom = node.name;
    return inner;
  }

  const compact = compactNode(node);

  if (node.children && node.children.length > 0) {
    const counts = new Map<string, number>();
    const representatives = new Map<string, Record<string, unknown>>();
    const nonInstances: Record<string, unknown>[] = [];

    for (const child of node.children) {
      if (child.type === "INSTANCE" && child.componentId) {
        counts.set(child.componentId, (counts.get(child.componentId) ?? 0) + 1);
        if (!representatives.has(child.componentId)) {
          representatives.set(child.componentId, compactTreeRecursive(child));
        }
      } else {
        nonInstances.push(compactTreeRecursive(child));
      }
    }

    const dedupedInstances: Record<string, unknown>[] = [];
    for (const [componentId, count] of counts) {
      const rep = representatives.get(componentId)!;
      if (count > 1) rep._instanceCount = count;
      dedupedInstances.push(rep);
    }

    compact.children = [...nonInstances, ...dedupedInstances];
  }

  return compact;
}

/** Count FRAME descendants for rate-limiting and oversized-file checks. */
export function countFrames(node: FigmaNode): number {
  let count = node.type === "FRAME" ? 1 : 0;
  if (node.children) {
    for (const child of node.children) count += countFrames(child);
  }
  return count;
}

/**
 * Compact a raw Figma tree. Throws FileTooLargeError if compacted output
 * exceeds the 120k-token budget even after all reduction tactics.
 */
export function compactTree(raw: FigmaNode): CompactionResult {
  const rawTokens = countTokens(raw);
  const tree = compactTreeRecursive(raw) as CompactFigmaTree;
  const compactedTokens = countTokens(tree);
  const frameCount = countFrames(raw);

  const reductionPercent =
    rawTokens > 0
      ? Math.round(((rawTokens - compactedTokens) / rawTokens) * 100)
      : 0;

  const warnings: string[] = [];
  if (compactedTokens > WARN_TOKEN_THRESHOLD && compactedTokens <= MAX_TOKEN_THRESHOLD) {
    warnings.push(
      `Compacted tree is ${compactedTokens.toLocaleString()} tokens — approaching the 120k limit.`
    );
  }
  if (compactedTokens > MAX_TOKEN_THRESHOLD) {
    throw new FileTooLargeError(compactedTokens);
  }

  return {
    tree,
    frameCount,
    rawTokens,
    compactedTokens,
    reductionPercent,
    warnings,
  };
}
