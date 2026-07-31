-- 003_enable_rls_on_audits.sql
-- Legible — enable Row Level Security on the audits table.
--
-- The app only ever talks to Supabase through the service-role key
-- (lib/db/supabase.ts), which bypasses RLS, so this migration changes
-- nothing about how the app works. What it does change: with RLS off,
-- anyone holding the project's anon key could read or write the audits
-- table directly through Supabase's auto-generated REST API (PostgREST).
-- Enabling RLS with no policies closes that door completely — the anon
-- and authenticated roles get zero access, and only the service role
-- can touch the table.
--
-- This also clears the "RLS disabled" warning Supabase shows in the
-- dashboard's security advisor.

alter table audits enable row level security;

-- No policies are created on purpose. Service role bypasses RLS;
-- everything else is denied.
