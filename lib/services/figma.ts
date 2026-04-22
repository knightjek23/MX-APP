/**
 * FigmaService — wraps the Figma REST API.
 *
 * Constructor takes a token (PAT or OAuth access token — interchangeable).
 * fetchFile returns a FigmaNode tree, either the full document or a
 * single-node subtree when nodeId is provided.
 *
 * Security: the token is kept on the instance and sent only in the
 * X-Figma-Token header. It is never logged.
 */

import type { FigmaFile, FigmaNode, FigmaNodesResponse } from "@/lib/types/figma";
import { logger } from "@/lib/logger";

const FIGMA_API_BASE = "https://api.figma.com";

export class InvalidTokenError extends Error {
  constructor() {
    super(
      "Figma token is invalid or expired. Generate a new Personal Access Token in Figma (Settings → Security → Personal access tokens) and try again."
    );
    this.name = "InvalidTokenError";
  }
}

export class FileNotFoundError extends Error {
  constructor(identifier: string) {
    super(
      `Figma file or node ${identifier} was not found, or your token doesn't have access to it.`
    );
    this.name = "FileNotFoundError";
  }
}

export class FigmaApiError extends Error {
  readonly status: number;
  constructor(status: number, body: string) {
    super(`Figma API returned ${status}: ${body.slice(0, 200)}`);
    this.name = "FigmaApiError";
    this.status = status;
  }
}

export class FigmaService {
  constructor(private readonly token: string) {
    if (!token || token.trim().length === 0) {
      throw new InvalidTokenError();
    }
  }

  private headers(): HeadersInit {
    return {
      "X-Figma-Token": this.token,
      Accept: "application/json",
    };
  }

  private async get<T>(path: string): Promise<T> {
    const url = `${FIGMA_API_BASE}${path}`;
    const response = await fetch(url, { headers: this.headers() });

    if (response.status === 401 || response.status === 403) {
      throw new InvalidTokenError();
    }
    if (response.status === 404) {
      throw new FileNotFoundError(path);
    }
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new FigmaApiError(response.status, body);
    }
    return (await response.json()) as T;
  }

  /**
   * Fetch a Figma file or a single-node subtree.
   *
   * When nodeId is provided, uses the /nodes endpoint with depth=3 to
   * keep the payload manageable. When omitted, fetches the full document
   * with depth=4 (enough to see frames, their children, and one extra level).
   */
  async fetchFile(fileId: string, nodeId?: string): Promise<FigmaNode> {
    if (nodeId) {
      const encoded = encodeURIComponent(nodeId);
      const data = await this.get<FigmaNodesResponse>(
        `/v1/files/${fileId}/nodes?ids=${encoded}&depth=3`
      );
      const entry = data.nodes[nodeId];
      if (!entry || !entry.document) {
        throw new FileNotFoundError(`${fileId}:${nodeId}`);
      }
      logger.info("figma.fetchNode", { fileId, nodeId });
      return entry.document;
    }

    const data = await this.get<FigmaFile>(`/v1/files/${fileId}?depth=4`);
    logger.info("figma.fetchFile", {
      fileId,
      pages: data.document.children?.length ?? 0,
    });
    return data.document;
  }
}
