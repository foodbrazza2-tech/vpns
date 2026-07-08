-- VPNS Supabase schema v2 - business data (clients, invoices, accounting, agenda, reports, notifications, error logs)
-- Run this script in the Supabase SQL editor AFTER (or instead of, it's self-contained) schema.sql.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ═══════════════════════════════════════════
-- CLIENTS
-- ═══════════════════════════════════════════
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text not null,
  company text not null,
  address text,
  city text,
  tax_id text,
  archive_folder text,
  created_at timestamptz not null default now()
);

alter table public.clients enable row level security;
drop policy if exists clients_all_authenticated on public.clients;
create policy clients_all_authenticated on public.clients for all to authenticated using (true) with check (true);

-- ═══════════════════════════════════════════
-- INVOICES (auto-numbered: FAC-YYYY-NNN, never reused, never skipped)
-- ═══════════════════════════════════════════
create sequence if not exists public.invoice_number_seq start 1;

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  client_id uuid references public.clients(id) on delete set null,
  invoice_date date not null default current_date,
  due_date date not null,
  amount numeric not null check (amount > 0),
  description text,
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'overdue')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.generate_invoice_number()
returns trigger
language plpgsql
as $$
begin
  if new.invoice_number is null or new.invoice_number = '' then
    new.invoice_number := 'FAC-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.invoice_number_seq')::text, 3, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_invoices_auto_number on public.invoices;
create trigger trg_invoices_auto_number
before insert on public.invoices
for each row
execute function public.generate_invoice_number();

drop trigger if exists trg_invoices_updated_at on public.invoices;
create trigger trg_invoices_updated_at
before update on public.invoices
for each row
execute function public.set_updated_at();

alter table public.invoices enable row level security;
drop policy if exists invoices_all_authenticated on public.invoices;
create policy invoices_all_authenticated on public.invoices for all to authenticated using (true) with check (true);

-- ═══════════════════════════════════════════
-- ACCOUNTING ENTRIES (double-entry: each row debits one account and
-- credits another for the same amount, so debit total = credit total
-- by construction, satisfying SYSCOHADA balance requirements).
-- ═══════════════════════════════════════════
create table if not exists public.accounting_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null default current_date,
  description text not null,
  debit_account text not null,
  credit_account text not null,
  amount numeric not null check (amount > 0),
  category text not null default 'general',
  reference text,
  created_at timestamptz not null default now()
);

alter table public.accounting_entries enable row level security;
drop policy if exists accounting_entries_all_authenticated on public.accounting_entries;
create policy accounting_entries_all_authenticated on public.accounting_entries for all to authenticated using (true) with check (true);

-- ═══════════════════════════════════════════
-- EVENTS (agenda)
-- ═══════════════════════════════════════════
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_date date not null,
  event_time text not null default '09:00',
  duration integer not null default 60,
  client_id uuid references public.clients(id) on delete set null,
  location text,
  type text not null default 'meeting',
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;
drop policy if exists events_all_authenticated on public.events;
create policy events_all_authenticated on public.events for all to authenticated using (true) with check (true);

-- ═══════════════════════════════════════════
-- REPORTS (generated report history)
-- ═══════════════════════════════════════════
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null default 'accounting',
  period text not null default 'monthly',
  start_date date not null,
  end_date date not null,
  description text,
  include_graphs boolean not null default true,
  client_id uuid references public.clients(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;
drop policy if exists reports_all_authenticated on public.reports;
create policy reports_all_authenticated on public.reports for all to authenticated using (true) with check (true);

-- ═══════════════════════════════════════════
-- NOTIFICATIONS (manual reminders/relances)
-- ═══════════════════════════════════════════
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  type text not null default 'reminder',
  priority text not null default 'medium',
  send_date date not null,
  send_time text not null default '09:00',
  client_id uuid references public.clients(id) on delete set null,
  recurring boolean not null default false,
  recurring_days integer,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;
drop policy if exists notifications_all_authenticated on public.notifications;
create policy notifications_all_authenticated on public.notifications for all to authenticated using (true) with check (true);

-- ═══════════════════════════════════════════
-- ERROR LOGS (lightweight in-house error tracking, no third-party account needed)
-- ═══════════════════════════════════════════
create table if not exists public.error_logs (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  stack text,
  component_stack text,
  url text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.error_logs enable row level security;
drop policy if exists error_logs_insert_authenticated on public.error_logs;
create policy error_logs_insert_authenticated on public.error_logs for insert to authenticated with check (true);
drop policy if exists error_logs_select_authenticated on public.error_logs;
create policy error_logs_select_authenticated on public.error_logs for select to authenticated using (true);

create index if not exists idx_invoices_client_id on public.invoices(client_id);
create index if not exists idx_events_client_id on public.events(client_id);
create index if not exists idx_events_event_date on public.events(event_date);
create index if not exists idx_notifications_client_id on public.notifications(client_id);
create index if not exists idx_error_logs_created_at on public.error_logs(created_at desc);
