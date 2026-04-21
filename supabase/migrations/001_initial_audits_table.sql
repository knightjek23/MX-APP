-- 001_initial_audits_table.sql
-- Legible — initial audits table
-- Week 1: anonymous audits keyed by hashed IP. No user_id until Clerk lands Month 1.

create table audits (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  figma_file_id text not null,
  figma_node_id text,
  figma_url text not null,
  scope text not null check (scope in ('full-file', 'single-frame')),
  frame_count integer not null,
  run_at_utc timestamptz not null default now(),
  model text not null,
  latency_ms integer,
  tokens_input integer,
  tokens_output integer,
  tokens_compacted integer,
  cost_usd numeric(10,4),
  audit_json jsonb not null,
  error text,
  user_ip_hash text,
  created_at timestamptz not null default now()
);

create index audits_slug_idx on audits(slug);
create index audits_run_at_idx on audits(run_at_utc desc);
