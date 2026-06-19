-- Repair UUID defaults on tables that may have been created before
-- gen_random_uuid() defaults were consistently applied.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE IF EXISTS leads ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS pipelines ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS stages ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS lead_pipeline ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS activities ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS custom_fields ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS lead_custom_values ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS users ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE IF EXISTS leads ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE IF EXISTS leads ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE IF EXISTS activities ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE IF EXISTS activities ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE IF EXISTS custom_fields ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE IF EXISTS custom_fields ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE IF EXISTS lead_custom_values ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE IF EXISTS lead_custom_values ALTER COLUMN updated_at SET DEFAULT now();
