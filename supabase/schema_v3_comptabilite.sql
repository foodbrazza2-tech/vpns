-- VPNS Supabase schema v3 - comptabilite avancee
-- TVA sur factures, paiements partiels, rapprochement bancaire, contre-passation.
-- A executer dans le SQL editor Supabase APRES schema_v2_business_data.sql.
-- Idempotent : peut etre relance sans risque.

-- ═══════════════════════════════════════════
-- FACTURES : TVA (Congo-Brazzaville, taux normal 18%)
-- amount reste le montant TTC (retro-compatible).
-- ═══════════════════════════════════════════
alter table public.invoices add column if not exists amount_ht numeric;
alter table public.invoices add column if not exists vat_rate numeric not null default 18;
alter table public.invoices add column if not exists vat_amount numeric;

-- Renseigne les colonnes HT/TVA pour les factures existantes (calcul retroactif a 18%).
update public.invoices
set amount_ht = round(amount / 1.18, 2),
    vat_amount = amount - round(amount / 1.18, 2)
where amount_ht is null;

-- ═══════════════════════════════════════════
-- PAIEMENTS (suivi des reglements partiels par facture)
-- ═══════════════════════════════════════════
create table if not exists public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  amount numeric not null check (amount > 0),
  payment_date date not null default current_date,
  method text not null default 'especes',
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_invoice_payments_invoice_id on public.invoice_payments(invoice_id);

alter table public.invoice_payments enable row level security;
drop policy if exists invoice_payments_all_authenticated on public.invoice_payments;
create policy invoice_payments_all_authenticated on public.invoice_payments for all to authenticated using (true) with check (true);

-- ═══════════════════════════════════════════
-- ECRITURES COMPTABLES : rapprochement bancaire + contre-passation
-- ═══════════════════════════════════════════
alter table public.accounting_entries add column if not exists reconciled boolean not null default false;
alter table public.accounting_entries add column if not exists reversed boolean not null default false;
alter table public.accounting_entries add column if not exists reverses_entry_id uuid references public.accounting_entries(id) on delete set null;
