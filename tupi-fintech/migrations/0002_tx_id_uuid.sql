-- 0002_tx_id_uuid.sql
-- If table exists with id text, migrate to uuid.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='transactions' AND column_name='id' AND data_type <> 'uuid'
  ) THEN
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    ALTER TABLE transactions ADD COLUMN id_uuid uuid DEFAULT gen_random_uuid();
    UPDATE transactions SET id_uuid = CASE
      WHEN id ~* '^[0-9a-f-]{36}$' THEN id::uuid
      ELSE gen_random_uuid()
    END;
    ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_pkey;
    ALTER TABLE transactions DROP COLUMN id;
    ALTER TABLE transactions RENAME COLUMN id_uuid TO id;
    ALTER TABLE transactions ADD PRIMARY KEY (id);
  END IF;
END$$;