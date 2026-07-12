-- VPNS Supabase schema v4 - comptabilisation automatique
-- Classe les ecritures par journal et les relie a leur piece source (facture/paiement),
-- et ajoute le type de facture (vente/achat) + le compte de contrepartie.
-- A executer dans le SQL editor Supabase APRES schema_v3_comptabilite.sql. Idempotent.

-- Journal comptable de l'ecriture : ventes, achats, banque, od (operations diverses).
alter table public.accounting_entries add column if not exists journal text not null default 'od';
-- Piece source pour eviter la double-comptabilisation et permettre l'annulation.
alter table public.accounting_entries add column if not exists source_type text; -- 'invoice' | 'payment' | 'manual'
alter table public.accounting_entries add column if not exists source_id uuid;

create index if not exists idx_accounting_entries_source on public.accounting_entries(source_type, source_id);
create index if not exists idx_accounting_entries_journal on public.accounting_entries(journal);

-- Type de facture : vente (client) ou achat (fournisseur), + compte de produit/charge.
alter table public.invoices add column if not exists type text not null default 'vente';
alter table public.invoices add column if not exists counterpart_account text;
