-- Simple Custom Fields System (without functions)
-- Create tables if they don't exist

CREATE TABLE IF NOT EXISTS custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL,
  label varchar(200) NOT NULL,
  field_type varchar(50) NOT NULL CHECK (field_type IN ('text', 'email', 'phone', 'number', 'select', 'checkbox', 'textarea', 'date')),
  is_required boolean DEFAULT false,
  placeholder varchar(200),
  help_text varchar(500),
  options jsonb,
  validation_rules jsonb,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lead_custom_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  custom_field_id uuid NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
  value text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(lead_id, custom_field_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_custom_fields_active ON custom_fields(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_lead_custom_values_lead_id ON lead_custom_values(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_custom_values_field_id ON lead_custom_values(custom_field_id);

-- Insert default fields only if table is empty
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM custom_fields LIMIT 1) THEN
    INSERT INTO custom_fields (name, label, field_type, is_required, placeholder, help_text, display_order, options) VALUES
    ('company_size', 'Tamanho da Empresa', 'select', false, '', 'Selecione o porte da sua empresa', 1, '{"options": ["1-10 funcionários", "11-50 funcionários", "51-200 funcionários", "200+ funcionários"]}'::jsonb),
    ('budget', 'Orçamento Mensal', 'select', false, '', 'Qual seu orçamento mensal para serviços financeiros?', 2, '{"options": ["Até R$ 1.000", "R$ 1.000 - R$ 5.000", "R$ 5.000 - R$ 10.000", "Acima de R$ 10.000"]}'::jsonb),
    ('urgency', 'Urgência', 'select', false, '', 'Qual a urgência para implementar a solução?', 3, '{"options": ["Imediato (até 1 mês)", "Curto prazo (1-3 meses)", "Médio prazo (3-6 meses)", "Longo prazo (6+ meses)"]}'::jsonb),
    ('current_bank', 'Banco Atual', 'text', false, 'Ex: Banco do Brasil', 'Qual seu banco principal atualmente?', 4, null),
    ('pain_points', 'Principais Desafios', 'textarea', false, 'Descreva seus principais desafios...', 'Conte-nos sobre suas dificuldades atuais', 5, null);
  END IF;
END $$;