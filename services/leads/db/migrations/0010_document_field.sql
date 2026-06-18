-- Unifica cpf em document + document_type para suportar leads CPF e CNPJ no modelo SaaS.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS document_type varchar(10) DEFAULT 'cpf',
  ADD COLUMN IF NOT EXISTS document      varchar(18);

UPDATE leads
SET document      = cpf,
    document_type = 'cpf'
WHERE cpf IS NOT NULL AND document IS NULL;

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

ALTER TABLE leads DROP COLUMN IF EXISTS cpf;
