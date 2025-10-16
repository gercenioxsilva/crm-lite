-- Fix activities table to ensure all required columns exist
-- This migration adds missing columns to the activities table

-- Add missing columns if they don't exist
ALTER TABLE activities ADD COLUMN IF NOT EXISTS duration_minutes integer;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS follow_up_required boolean DEFAULT false;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS next_action text;

-- Update existing activities to have proper structure
UPDATE activities SET 
  follow_up_required = false 
WHERE follow_up_required IS NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_activities_follow_up ON activities(follow_up_required);
CREATE INDEX IF NOT EXISTS idx_activities_type_created ON activities(type, created_at DESC);

-- Update sample activities with better data
UPDATE activities SET 
  duration_minutes = CASE 
    WHEN type = 'call' THEN 15
    WHEN type = 'meeting' THEN 45
    ELSE NULL
  END,
  follow_up_required = CASE 
    WHEN outcome IN ('interested', 'callback') THEN true
    ELSE false
  END,
  next_action = CASE 
    WHEN outcome = 'interested' THEN 'Enviar proposta comercial'
    WHEN outcome = 'callback' THEN 'Retornar ligação em 2 dias'
    WHEN outcome = 'no_answer' THEN 'Tentar contato novamente'
    ELSE NULL
  END
WHERE duration_minutes IS NULL OR follow_up_required IS NULL;

-- Ensure all activities have proper outcomes
UPDATE activities SET 
  outcome = CASE 
    WHEN outcome IS NULL AND type = 'call' THEN 'completed'
    WHEN outcome IS NULL AND type = 'email' THEN 'sent'
    WHEN outcome IS NULL AND type = 'meeting' THEN 'completed'
    WHEN outcome IS NULL THEN 'completed'
    ELSE outcome
  END
WHERE outcome IS NULL OR outcome = '';

-- Add constraint for valid activity types
ALTER TABLE activities DROP CONSTRAINT IF EXISTS chk_activity_type;
ALTER TABLE activities ADD CONSTRAINT chk_activity_type 
CHECK (type IN ('call', 'email', 'meeting', 'whatsapp', 'sms', 'note', 'task'));

-- Add constraint for valid outcomes
ALTER TABLE activities DROP CONSTRAINT IF EXISTS chk_activity_outcome;
ALTER TABLE activities ADD CONSTRAINT chk_activity_outcome 
CHECK (outcome IN ('interested', 'not_interested', 'callback', 'meeting_scheduled', 'no_answer', 'completed', 'sent', 'opened', 'clicked'));

-- Update statistics
ANALYZE activities;