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
  // SHA-256 of the client IP, stored for older anonymous audits. Nullable
  // for new audits where rate limiting keys on user_id instead. Kept on
  // the type for backward compatibility with rows persisted before auth.
  user_ip_hash: string | null;
  // Clerk user identifier (e.g. "user_2abc..."). Null for audits created
  // before authentication landed. New audits always have a value because
  // the audit route is gated by auth middleware.
  user_id: string | null;
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

  /**
   * Count total audits owned by a specific user. Used to enforce the
   * beta hard cap (currently 5 per user) in the audit route, so we can
   * block before doing any expensive Figma/Claude work.
   *
   * Uses Supabase's `head: true` so no row data is transferred — just
   * the count. ~50ms RTT.
   *
   * @param userId  Clerk user identifier
   */
  async countByUser(userId: string): Promise<number> {
    const { count, error } = await this.db
      .from("audits")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (error) {
      logger.error("audit.countByUser.failed", {
        userId,
        error: error.message,
      });
      throw new AuditFetchError(error.message);
    }

    return count ?? 0;
  }

  /**
   * Delete an audit by slug, scoped to a specific user. Filters on BOTH
   * slug AND user_id so a non-owner can't delete by guessing the URL.
   *
   * Returns { deleted: true } when one row matched and was removed,
   * { deleted: false } when nothing matched (wrong owner, missing slug,
   * or audit belongs to an anonymous historical record).
   *
   * @param slug    The audit's nanoid slug
   * @param userId  Clerk user identifier of the requester
   */
  async deleteBySlug(
    slug: string,
    userId: string
  ): Promise<{ deleted: boolean }> {
    const { count, error } = await this.db
      .from("audits")
      .delete({ count: "exact" })
      .eq("slug", slug)
      .eq("user_id", userId);

    if (error) {
      logger.error("audit.deleteBySlug.failed", {
        slug,
        error: error.message,
      });
      throw new AuditFetchError(error.message);
    }

    const deleted = (count ?? 0) > 0;
    logger.info("audit.deleteBySlug.complete", { slug, deleted });
    return { deleted };
  }

  /**
   * List audits owned by a specific user, ordered most-recent first.
   *
   * Used by the /audits dashboard. Filters on the partial index added in
   * migration 002, so anonymous historical rows (user_id IS NULL) never
   * appear in any user's list.
   *
   * @param userId  Clerk user identifier (e.g. "user_2abc...")
   * @param opts.limit  Max results to return. Defaults to 50.
   */
  async listByUser(
    userId: string,
    opts: { limit?: number } = {}
  ): Promise<StoredAudit[]> {
    const limit = opts.limit ?? 50;
    const { data, error } = await this.db
      .from("audits")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      logger.error("audit.listByUser.failed", {
        userId,
        error: error.message,
      });
      throw new AuditFetchError(error.message);
    }

    return (data as StoredAudit[] | null) ?? [];
  }
}
