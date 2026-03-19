-- 0001_init.sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id text NOT NULL,
  amount BIGINT NOT NULL CHECK (amount > 0),
  currency text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL CHECK (status IN ('authorized','declined')),
  reason text
);

CREATE INDEX IF NOT EXISTS idx_transactions_account_created ON transactions(account_id, created_at DESC);