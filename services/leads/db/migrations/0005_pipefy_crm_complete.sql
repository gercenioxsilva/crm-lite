-- Complete Pipefy-style CRM implementation
-- This migration ensures all CRM fields are properly set up

-- Ensure all enhanced fields exist
ALTER TABLE leads ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS job_title text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_value decimal(15,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS expected_close_date date;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_to text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_follow_up timestamptz;

-- Ensure stage relationship exists
ALTER TABLE leads ADD COLUMN IF NOT EXISTS stage_id uuid REFERENCES stages(id);

-- Update leads without stage_id to first stage
UPDATE leads 
SET stage_id = (SELECT id FROM stages ORDER BY order_no LIMIT 1)
WHERE stage_id IS NULL;

-- Create view for leads with stage information
CREATE OR REPLACE VIEW leads_with_stage AS
SELECT 
  l.*,
  s.name as stage_name,
  s.order_no as stage_order,
  s.stage_color,
  s.conversion_probability
FROM leads l
LEFT JOIN stages s ON l.stage_id = s.id;

-- Function to get pipeline with leads
CREATE OR REPLACE FUNCTION get_pipeline_with_leads()
RETURNS TABLE (
  stage_id uuid,
  stage_name text,
  stage_order integer,
  stage_color text,
  lead_id uuid,
  lead_name text,
  lead_email text,
  lead_company text,
  lead_job_title text,
  lead_value decimal,
  lead_priority text,
  lead_temperature text,
  lead_assigned_to text,
  lead_next_follow_up timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as stage_id,
    s.name as stage_name,
    s.order_no as stage_order,
    s.stage_color,
    l.id as lead_id,
    l.name as lead_name,
    l.email as lead_email,
    l.company as lead_company,
    l.job_title as lead_job_title,
    l.lead_value,
    l.priority as lead_priority,
    l.temperature as lead_temperature,
    l.assigned_to as lead_assigned_to,
    l.next_follow_up as lead_next_follow_up
  FROM stages s
  LEFT JOIN leads l ON s.id = l.stage_id
  ORDER BY s.order_no, l.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Update sample data with better CRM information
UPDATE leads SET 
  company = CASE 
    WHEN name ILIKE '%joão%' THEN 'TechCorp Solutions'
    WHEN name ILIKE '%maria%' THEN 'Inovação Digital Ltda'
    WHEN name ILIKE '%carlos%' THEN 'StartupTech Brasil'
    WHEN name ILIKE '%ana%' THEN 'Fintech Moderna'
    WHEN name ILIKE '%pedro%' THEN 'Consultoria Empresarial'
    ELSE 'Empresa ' || substring(name from 1 for 10)
  END,
  job_title = CASE
    WHEN name ILIKE '%joão%' THEN 'CTO'
    WHEN name ILIKE '%maria%' THEN 'CEO'
    WHEN name ILIKE '%carlos%' THEN 'Diretor de TI'
    WHEN name ILIKE '%ana%' THEN 'Founder'
    WHEN name ILIKE '%pedro%' THEN 'Gerente Geral'
    ELSE 'Decisor'
  END,
  lead_value = CASE
    WHEN score > 90 THEN 75000.00
    WHEN score > 80 THEN 50000.00
    WHEN score > 70 THEN 35000.00
    WHEN score > 60 THEN 25000.00
    WHEN score > 50 THEN 15000.00
    ELSE 10000.00
  END,
  expected_close_date = CASE
    WHEN temperature = 'hot' THEN current_date + interval '15 days'
    WHEN temperature = 'warm' THEN current_date + interval '30 days'
    ELSE current_date + interval '60 days'
  END,
  priority = CASE
    WHEN score > 90 THEN 'urgent'
    WHEN score > 75 THEN 'high'
    WHEN score > 50 THEN 'medium'
    ELSE 'low'
  END,
  assigned_to = CASE
    WHEN id::text LIKE '%1%' OR id::text LIKE '%3%' OR id::text LIKE '%5%' THEN 'vendedor1@quiz.com'
    WHEN id::text LIKE '%2%' OR id::text LIKE '%4%' OR id::text LIKE '%6%' THEN 'vendedor2@quiz.com'
    ELSE 'vendedor3@quiz.com'
  END,
  next_follow_up = CASE
    WHEN temperature = 'hot' THEN now() + interval '1 day'
    WHEN temperature = 'warm' THEN now() + interval '3 days'
    ELSE now() + interval '7 days'
  END
WHERE company IS NULL OR job_title IS NULL;

-- Ensure all leads have a stage
UPDATE leads 
SET stage_id = (
  SELECT s.id FROM stages s 
  WHERE s.order_no = CASE
    WHEN leads.temperature = 'hot' AND leads.score > 80 THEN 3 -- Proposta
    WHEN leads.temperature = 'warm' OR leads.score > 60 THEN 2 -- Qualificado
    ELSE 1 -- Novo Lead
  END
  ORDER BY s.order_no 
  LIMIT 1
)
WHERE stage_id IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leads_stage_id ON leads(stage_id);
CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company);
CREATE INDEX IF NOT EXISTS idx_leads_job_title ON leads(job_title);
CREATE INDEX IF NOT EXISTS idx_leads_lead_value ON leads(lead_value);
CREATE INDEX IF NOT EXISTS idx_leads_expected_close_date ON leads(expected_close_date);

-- Insert sample activities for existing leads
INSERT INTO activities (lead_id, type, description, outcome, created_at)
SELECT 
  l.id,
  CASE 
    WHEN l.temperature = 'hot' THEN 'call'
    WHEN l.temperature = 'warm' THEN 'email'
    ELSE 'note'
  END,
  CASE 
    WHEN l.temperature = 'hot' THEN 'Ligação de qualificação realizada'
    WHEN l.temperature = 'warm' THEN 'Email de apresentação enviado'
    ELSE 'Lead capturado via formulário'
  END,
  CASE 
    WHEN l.temperature = 'hot' THEN 'interested'
    WHEN l.temperature = 'warm' THEN 'callback'
    ELSE 'no_answer'
  END,
  l.created_at + interval '1 hour'
FROM leads l
WHERE NOT EXISTS (
  SELECT 1 FROM activities a WHERE a.lead_id = l.id
)
LIMIT 50; -- Limit to avoid too many activities

-- Update statistics
ANALYZE leads;
ANALYZE stages;
ANALYZE activities;