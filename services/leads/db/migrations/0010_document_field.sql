-- Unifica cpf em document + document_type para suportar leads CPF e CNPJ no modelo SaaS.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS document_type varchar(10) DEFAULT 'cpf',
  ADD COLUMN IF NOT EXISTS document      varchar(18);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leads'
      AND column_name = 'cpf'
  ) THEN
    EXECUTE '
      UPDATE leads
      SET document = cpf,
          document_type = ''cpf''
      WHERE cpf IS NOT NULL AND document IS NULL
    ';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'chk_lead_document_type'
      AND table_name = 'leads'
  ) THEN
    ALTER TABLE leads
      ADD CONSTRAINT chk_lead_document_type
      CHECK (document_type IN ('cpf', 'cnpj'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_leads_document ON leads(tenant_id, document_type, document);

-- leads_with_stage (created in 0005) uses SELECT l.* which PostgreSQL expands at view
-- creation time, recording a dependency on every column including cpf.
-- DROP COLUMN without CASCADE would fail: "cannot drop column cpf ... because other
-- objects depend on it". Drop the view first, drop cpf, then recreate the view.
DROP VIEW IF EXISTS leads_with_stage;

ALTER TABLE leads DROP COLUMN IF EXISTS cpf;

-- Recreate view; l.* now includes document_type / document but not cpf.
CREATE OR REPLACE VIEW leads_with_stage AS
SELECT
  l.*,
  s.name                   AS stage_name,
  s.order_no               AS stage_order,
  s.stage_color,
  s.conversion_probability
FROM leads l
LEFT JOIN stages s ON l.stage_id = s.id;
