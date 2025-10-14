-- Enhanced CRM fields for better lead management
ALTER TABLE leads ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS job_title text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_value decimal(15,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS expected_close_date date;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_to text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_follow_up timestamptz;

-- Priority constraint
ALTER TABLE leads DROP CONSTRAINT IF EXISTS chk_lead_priority;
ALTER TABLE leads ADD CONSTRAINT chk_lead_priority 
CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

-- Enhanced activities with more types
ALTER TABLE activities ADD COLUMN IF NOT EXISTS duration_minutes integer;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS contact_method text DEFAULT 'phone';
ALTER TABLE activities ADD COLUMN IF NOT EXISTS follow_up_required boolean DEFAULT false;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS next_action text;

-- Lead scoring enhancements
CREATE TABLE IF NOT EXISTS lead_scores (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  score_type text not null, -- demographic, behavioral, engagement
  score_value integer not null,
  reason text,
  created_at timestamptz not null default now()
);

-- Communication preferences
CREATE TABLE IF NOT EXISTS lead_preferences (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  preferred_contact_method text DEFAULT 'email', -- email, phone, whatsapp, sms
  preferred_contact_time text DEFAULT 'business_hours', -- morning, afternoon, evening, business_hours
  timezone text DEFAULT 'America/Sao_Paulo',
  language text DEFAULT 'pt-BR',
  opt_in_marketing boolean DEFAULT true,
  created_at timestamptz not null default now()
);

-- Lead interactions tracking
CREATE TABLE IF NOT EXISTS lead_interactions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  interaction_type text not null, -- email_open, link_click, form_submit, page_view
  interaction_data jsonb DEFAULT '{}',
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

-- Enhanced pipeline stages with conversion rates
ALTER TABLE stages ADD COLUMN IF NOT EXISTS expected_duration_days integer DEFAULT 7;
ALTER TABLE stages ADD COLUMN IF NOT EXISTS stage_color text DEFAULT '#6366f1';
ALTER TABLE stages ADD COLUMN IF NOT EXISTS is_closed boolean DEFAULT false;
ALTER TABLE stages ADD COLUMN IF NOT EXISTS stage_type text DEFAULT 'active'; -- active, won, lost

-- Lead stage history for tracking movement
CREATE TABLE IF NOT EXISTS lead_stage_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  from_stage_id uuid references stages(id),
  to_stage_id uuid not null references stages(id),
  moved_by text,
  moved_at timestamptz not null default now(),
  duration_in_previous_stage interval,
  notes text
);

-- Update existing stages with enhanced data
UPDATE stages SET 
  expected_duration_days = CASE 
    WHEN order_no = 1 THEN 3  -- Novo Lead: 3 days
    WHEN order_no = 2 THEN 7  -- Qualificado: 7 days  
    WHEN order_no = 3 THEN 14 -- Proposta: 14 days
    WHEN order_no = 4 THEN 10 -- Negociação: 10 days
    WHEN order_no = 5 THEN 1  -- Fechado: 1 day
  END,
  stage_color = CASE
    WHEN order_no = 1 THEN '#94a3b8' -- gray
    WHEN order_no = 2 THEN '#3b82f6' -- blue
    WHEN order_no = 3 THEN '#f59e0b' -- amber
    WHEN order_no = 4 THEN '#ef4444' -- red
    WHEN order_no = 5 THEN '#22c55e' -- green
  END,
  is_closed = CASE WHEN order_no = 5 THEN true ELSE false END,
  stage_type = CASE WHEN order_no = 5 THEN 'won' ELSE 'active' END;

-- Add lost stage
INSERT INTO stages (id, pipeline_id, name, order_no, conversion_probability, expected_duration_days, stage_color, is_closed, stage_type) 
VALUES ('550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440000', 'Perdido', 6, 0, 1, '#6b7280', true, 'lost')
ON CONFLICT DO NOTHING;

-- Sample enhanced data
UPDATE leads SET 
  company = CASE 
    WHEN name LIKE '%João%' THEN 'Tech Solutions Ltda'
    WHEN name LIKE '%Maria%' THEN 'Consultoria Empresarial'
    WHEN name LIKE '%Carlos%' THEN 'Inovação Digital'
    WHEN name LIKE '%Ana%' THEN 'Startup Fintech'
    ELSE 'Empresa Individual'
  END,
  job_title = CASE
    WHEN name LIKE '%João%' THEN 'CTO'
    WHEN name LIKE '%Maria%' THEN 'CEO'
    WHEN name LIKE '%Carlos%' THEN 'Gerente de TI'
    WHEN name LIKE '%Ana%' THEN 'Founder'
    ELSE 'Empresário'
  END,
  lead_value = CASE
    WHEN monthly_income > 10000 THEN 50000.00
    WHEN monthly_income > 8000 THEN 30000.00
    WHEN monthly_income > 6000 THEN 20000.00
    ELSE 10000.00
  END,
  priority = CASE
    WHEN score > 90 THEN 'urgent'
    WHEN score > 75 THEN 'high'
    WHEN score > 50 THEN 'medium'
    ELSE 'low'
  END,
  assigned_to = CASE
    WHEN id::text LIKE '%1111%' OR id::text LIKE '%3333%' OR id::text LIKE '%5555%' THEN 'vendedor1@quiz.com'
    ELSE 'vendedor2@quiz.com'
  END,
  next_follow_up = now() + interval '2 days'
WHERE company IS NULL;

-- Insert lead preferences
INSERT INTO lead_preferences (lead_id, preferred_contact_method, preferred_contact_time)
SELECT id, 
  CASE 
    WHEN phone IS NOT NULL THEN 'phone'
    ELSE 'email'
  END,
  CASE 
    WHEN EXTRACT(hour from created_at) < 12 THEN 'morning'
    WHEN EXTRACT(hour from created_at) < 18 THEN 'afternoon'
    ELSE 'evening'
  END
FROM leads 
WHERE NOT EXISTS (SELECT 1 FROM lead_preferences WHERE lead_preferences.lead_id = leads.id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);
CREATE INDEX IF NOT EXISTS idx_leads_next_follow_up ON leads(next_follow_up);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_type ON lead_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_lead_stage_history_lead ON lead_stage_history(lead_id, moved_at);

-- Function to automatically update lead score based on activities
CREATE OR REPLACE FUNCTION update_lead_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Increase score based on positive activities
  IF NEW.outcome IN ('interested', 'callback', 'meeting_scheduled') THEN
    UPDATE leads SET 
      score = LEAST(score + 10, 100),
      temperature = CASE 
        WHEN score + 10 > 80 THEN 'hot'
        WHEN score + 10 > 50 THEN 'warm'
        ELSE 'cold'
      END
    WHERE id = NEW.lead_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update score on activity insert
DROP TRIGGER IF EXISTS trigger_update_lead_score ON activities;
CREATE TRIGGER trigger_update_lead_score
  AFTER INSERT ON activities
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_score();