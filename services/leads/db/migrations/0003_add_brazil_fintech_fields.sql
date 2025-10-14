-- Add Brazilian fintech customer fields to leads
alter table if exists leads add column if not exists cpf text;
alter table if exists leads add column if not exists phone text;
alter table if exists leads add column if not exists birth_date date;
alter table if exists leads add column if not exists cep text;
alter table if exists leads add column if not exists address_line text;
alter table if exists leads add column if not exists number text;
alter table if exists leads add column if not exists complement text;
alter table if exists leads add column if not exists neighborhood text;
alter table if exists leads add column if not exists city text;
alter table if exists leads add column if not exists state text;
alter table if exists leads add column if not exists monthly_income numeric(12,2);
alter table if exists leads add column if not exists terms_accepted boolean default false;
alter table if exists leads add column if not exists consent_lgpd boolean default false;
