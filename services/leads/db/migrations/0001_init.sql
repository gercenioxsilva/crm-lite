-- CRM Leads table with comprehensive fintech fields
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  phone text,
  cpf text,
  birth_date date,
  
  -- Address
  cep text,
  address_line text,
  number text,
  complement text,
  neighborhood text,
  city text,
  state text,
  
  -- Financial
  monthly_income decimal(15,2),
  
  -- Lead source and tracking
  source text not null default 'unknown',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  
  -- Status and scoring
  status text not null default 'new',
  score integer default 0,
  temperature text default 'cold', -- cold, warm, hot
  
  -- Compliance
  terms_accepted boolean default false,
  consent_lgpd boolean default false,
  
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_contact_at timestamptz,
  
  -- Metadata
  metadata jsonb default '{}'
);

-- Indexes for performance
create index if not exists idx_leads_email on leads(email);
create index if not exists idx_leads_status on leads(status);
create index if not exists idx_leads_source on leads(source);
create index if not exists idx_leads_created_at on leads(created_at desc);
create index if not exists idx_leads_score on leads(score desc);
create index if not exists idx_leads_temperature on leads(temperature);

-- Lead status enum constraint
alter table leads add constraint chk_lead_status 
check (status in ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'));

-- Temperature constraint
alter table leads add constraint chk_lead_temperature 
check (temperature in ('cold', 'warm', 'hot'));

-- Update trigger for updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_leads_updated_at before update on leads
for each row execute function update_updated_at_column();