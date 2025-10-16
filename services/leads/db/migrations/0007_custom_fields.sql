-- Custom Fields System for Dynamic Lead Forms
-- Allows admins to create custom fields that appear in lead capture forms

-- Table to store custom field definitions
CREATE TABLE IF NOT EXISTS custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL,
  label varchar(200) NOT NULL,
  field_type varchar(50) NOT NULL CHECK (field_type IN ('text', 'email', 'phone', 'number', 'select', 'checkbox', 'textarea', 'date')),
  is_required boolean DEFAULT false,
  placeholder varchar(200),
  help_text varchar(500),
  options jsonb, -- For select fields: {"options": ["Option 1", "Option 2"]}
  validation_rules jsonb, -- {"min_length": 3, "max_length": 100, "pattern": "regex"}
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table to store custom field values for leads
CREATE TABLE IF NOT EXISTS lead_custom_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  custom_field_id uuid NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
  value text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(lead_id, custom_field_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_custom_fields_active ON custom_fields(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_lead_custom_values_lead_id ON lead_custom_values(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_custom_values_field_id ON lead_custom_values(custom_field_id);

-- Insert some default custom fields
INSERT INTO custom_fields (name, label, field_type, is_required, placeholder, help_text, display_order, is_active) VALUES
('company_size', 'Tamanho da Empresa', 'select', false, '', 'Selecione o porte da sua empresa', 1, true),
('budget', 'Orçamento Mensal', 'select', false, '', 'Qual seu orçamento mensal para serviços financeiros?', 2, true),
('urgency', 'Urgência', 'select', false, '', 'Qual a urgência para implementar a solução?', 3, true),
('current_bank', 'Banco Atual', 'text', false, 'Ex: Banco do Brasil', 'Qual seu banco principal atualmente?', 4, true),
('pain_points', 'Principais Desafios', 'textarea', false, 'Descreva seus principais desafios...', 'Conte-nos sobre suas dificuldades atuais', 5, true);

-- Update options for select fields
UPDATE custom_fields SET options = '{"options": ["1-10 funcionários", "11-50 funcionários", "51-200 funcionários", "200+ funcionários"]}' 
WHERE name = 'company_size';

UPDATE custom_fields SET options = '{"options": ["Até R$ 1.000", "R$ 1.000 - R$ 5.000", "R$ 5.000 - R$ 10.000", "Acima de R$ 10.000"]}' 
WHERE name = 'budget';

UPDATE custom_fields SET options = '{"options": ["Imediato (até 1 mês)", "Curto prazo (1-3 meses)", "Médio prazo (3-6 meses)", "Longo prazo (6+ meses)"]}' 
WHERE name = 'urgency';

-- Function to get active custom fields
CREATE OR REPLACE FUNCTION get_active_custom_fields()
RETURNS TABLE (
  id uuid,
  name varchar,
  label varchar,
  field_type varchar,
  is_required boolean,
  placeholder varchar,
  help_text varchar,
  options jsonb,
  validation_rules jsonb,
  display_order integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cf.id,
    cf.name,
    cf.label,
    cf.field_type,
    cf.is_required,
    cf.placeholder,
    cf.help_text,
    cf.options,
    cf.validation_rules,
    cf.display_order
  FROM custom_fields cf
  WHERE cf.is_active = true
  ORDER BY cf.display_order, cf.created_at;
END;
$$ LANGUAGE plpgsql;