-- 002_add_user_id_to_audits.sql
-- Legible — add user_id attribution to audits.
--
-- Audit creation now requires a Clerk-authenticated user (see middleware.ts).
-- The user_id column stores the Clerk user identifier (text format like
-- "user_2abc..."), nullable so that pre-auth historical rows remain valid.
--
-- The partial index excludes anonymous (NULL) historical rows from the
-- index — they're never queried by user.

alter table audits add column user_id text;

create index audits_user_id_idx
  on audits(user_id)
  where user_id is not null;
