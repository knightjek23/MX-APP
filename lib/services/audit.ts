/**
 * AuditService — persists audit records to Supabase and fetches them back
 * by slug.
 *
 * Slug is nanoid(10), unique, and safe for shareable URLs.
 * See PROJECT.md §3 for the table schema.
 */

import { nanoid } from "nanoid";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditResult } from "@/lib/types/audit";
import { logger } from "@/lib/logger";

export interface AuditRecord {
  figma_file_id: string;
  figma_node_id: string | null;
  figma_url: string;
  scope: "full-file" | "single-frame";
  frame_count: number;
  model: string;
  latency_ms: number;
  tokens_input: number;
  tokens_output: number;
  tokens_compacted: number;
  cost_usd: number;
  audit_json: AuditResult;
  error: string | null;
  user_ip_hash: string | null;
}

export interface StoredAudit extends AuditRecord {
  id: string;
  slug: string;
  run_at_utc: string;
  created_at: string;
}

export class AuditPersistError extends Error {
  constructor(cause: string) {
    super(`Failed to persist audit: ${cause}`);
    this.name = "AuditPersistError";
  }
}

export class AuditFetchError extends Error {
  constructor(cause: string) {
    super(`Failed to fetch audit: ${cause}`);
    this.name = "AuditFetchError";
  }
}

export class AuditService {
  constructor(private readonly db: SupabaseClient) {}

  async persist(record: AuditRecord): Promise<{ id: string; slug: string }> {
    const slug = nanoid(10);
    const run_at_utc = new Date().toISOString();

    const { data, error } = await this.db
      .from("audits")
      .insert({ ...record, slug, run_at_utc })
      .select("id, slug")
      .single();

    if (error || !data) {
      logger.error("audit.persist.failed", {
        slug,
        error: error?.message ?? "unknown error",
      });
      throw new AuditPersistError(error?.message ?? "unknown error");
    }

    logger.info("audit.persist.success", { slug, id: data.id });
    return { id: data.id as string, slug: data.slug as string };
  }

  async fetch(slug: string): Promise<StoredAudit | null> {
    const { data, error } = await this.db
      .from("audits")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      logger.error("audit.fetch.failed", { slug, error: error.message });
      throw new AuditFetchError(error.message);
    }

    return (data as StoredAudit | null) ?? null;
  }
}
