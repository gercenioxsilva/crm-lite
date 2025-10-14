-- CRM Pipeline Management
create table if not exists pipelines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  is_active boolean default true,
  created_at timestamptz not null default now()
);

-- Pipeline Stages
create table if not exists stages (
  id uuid primary key default gen_random_uuid(),
  pipeline_id uuid not null references pipelines(id) on delete cascade,
  name text not null,
  description text,
  order_no int not null,
  conversion_probability decimal(5,2) default 0, -- 0-100%
  created_at timestamptz not null default now()
);
create index if not exists idx_stages_pipeline_order on stages(pipeline_id, order_no);

-- Lead Pipeline Position
create table if not exists lead_pipeline (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  pipeline_id uuid not null references pipelines(id) on delete cascade,
  current_stage_id uuid not null references stages(id) on delete restrict,
  entered_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists uq_lead_pipeline_unique on lead_pipeline(lead_id, pipeline_id);

-- Activities (interactions with leads)
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  type text not null, -- call, email, meeting, whatsapp, sms, note
  subject text,
  description text,
  outcome text, -- success, no_answer, callback, interested, not_interested
  scheduled_at timestamptz,
  completed_at timestamptz,
  created_by text, -- user who created
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);
create index if not exists idx_activities_lead_created on activities(lead_id, created_at desc);
create index if not exists idx_activities_type on activities(type);
create index if not exists idx_activities_scheduled on activities(scheduled_at);

-- Lead Notes
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  content text not null,
  is_private boolean default false,
  created_by text,
  created_at timestamptz not null default now()
);
create index if not exists idx_notes_lead_created on notes(lead_id, created_at desc);

-- Tags for lead categorization
create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text default '#6366f1',
  created_at timestamptz not null default now()
);

create table if not exists lead_tags (
  lead_id uuid not null references leads(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (lead_id, tag_id)
);

-- Lead Scoring Rules
create table if not exists scoring_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  condition_field text not null,
  condition_operator text not null, -- equals, contains, greater_than, etc
  condition_value text not null,
  score_points integer not null,
  is_active boolean default true,
  created_at timestamptz not null default now()
);

-- Insert default pipeline and stages
insert into pipelines (id, name, description) values 
('550e8400-e29b-41d4-a716-446655440000', 'Vendas Fintech', 'Pipeline principal para leads de produtos financeiros')
on conflict do nothing;

insert into stages (id, pipeline_id, name, order_no, conversion_probability) values 
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Novo Lead', 1, 10),
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Qualificado', 2, 25),
('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'Proposta', 3, 50),
('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', 'Negociação', 4, 75),
('550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440000', 'Fechado', 5, 100)
on conflict do nothing;

-- Insert default tags
insert into tags (name, color) values 
('VIP', '#ef4444'),
('Interessado', '#22c55e'),
('Follow-up', '#f59e0b'),
('Conta Premium', '#8b5cf6'),
('Cartão de Crédito', '#06b6d4'),
('Empréstimo', '#ec4899')
on conflict do nothing;