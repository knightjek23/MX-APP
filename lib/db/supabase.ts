/**
 * Server-side Supabase client factory.
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY, which bypasses Row Level Security.
 * NEVER import this from the browser — the service role key is meant
 * to be used only in server components, route handlers, and server
 * actions. Next.js marks this via "server-only" runtime checks when
 * appropriate.
 *
 * Client is cached per-process for connection reuse across requests.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!cachedClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
      );
    }
    cachedClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return cachedClient;
}
