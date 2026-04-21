/**
 * Parse a Figma URL into { fileId, nodeId? }.
 *
 * Accepts:
 *   https://www.figma.com/file/<fileId>/...
 *   https://www.figma.com/design/<fileId>/...
 * with or without a `?node-id=<id>` query param.
 *
 * Figma URLs have used two nodeId formats over time:
 *   - legacy: "31%3A198"  (URL-encoded "31:198")
 *   - current: "31-198"   (dashes instead of colons)
 * Both are normalized to "31:198" for the REST API.
 *
 * Throws FigmaUrlError with a user-facing message on malformed input.
 */

export class FigmaUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FigmaUrlError";
  }
}

export interface ParsedFigmaUrl {
  fileId: string;
  nodeId?: string;
}

const FIGMA_URL_RE =
  /^https?:\/\/(?:www\.)?figma\.com\/(?:file|design)\/([A-Za-z0-9]+)(?:\/[^?]*)?(?:\?(.*))?$/;

export function parseFigmaUrl(input: string): ParsedFigmaUrl {
  const trimmed = (input ?? "").trim();
  if (!trimmed) {
    throw new FigmaUrlError("Figma URL is required.");
  }

  const match = trimmed.match(FIGMA_URL_RE);
  if (!match) {
    throw new FigmaUrlError(
      "That doesn't look like a Figma file URL. It should start with https://www.figma.com/file/ or https://www.figma.com/design/"
    );
  }

  const [, fileId, queryString] = match;
  if (!fileId) {
    throw new FigmaUrlError("Could not find a file ID in that URL.");
  }

  let nodeId: string | undefined;
  if (queryString) {
    const params = new URLSearchParams(queryString);
    const raw = params.get("node-id");
    if (raw) {
      // URLSearchParams decodes %3A → :. If the URL used dashes (1-2) we
      // still need to convert those to colons for the API.
      nodeId = raw.includes(":") ? raw : raw.replace(/-/g, ":");
    }
  }

  return nodeId ? { fileId, nodeId } : { fileId };
}
