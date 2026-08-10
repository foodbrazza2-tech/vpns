-- VPNS Supabase schema v8 - recherche plein-texte (memoire long-terme de
-- l'assistant, au-dela des quelques factures/clients recents deja envoyes
-- dans le contexte de chaque message). Choix delibere plutot qu'une base
-- vectorielle (Pinecone/Weaviate/pgvector) : a l'echelle d'un seul
-- utilisateur avec quelques centaines d'enregistrements, la recherche
-- plein-texte native de Postgres suffit largement, sans nouveau service a
-- payer/maintenir ni cout recurrent d'embeddings.
-- Idempotent. Colonnes generees (stored) : indexees, jamais a resynchroniser
-- a la main, toujours a jour avec la ligne.

alter table public.clients add column if not exists search_vector tsvector
  generated always as (
    to_tsvector('french', coalesce(name, '') || ' ' || coalesce(company, '') || ' ' || coalesce(email, '') || ' ' || coalesce(city, ''))
  ) stored;
create index if not exists idx_clients_search on public.clients using gin(search_vector);

alter table public.invoices add column if not exists search_vector tsvector
  generated always as (
    to_tsvector('french', coalesce(description, '') || ' ' || coalesce(invoice_number, ''))
  ) stored;
create index if not exists idx_invoices_search on public.invoices using gin(search_vector);

alter table public.accounting_entries add column if not exists search_vector tsvector
  generated always as (
    to_tsvector('french', coalesce(description, '') || ' ' || coalesce(category, '') || ' ' || coalesce(reference, ''))
  ) stored;
create index if not exists idx_accounting_entries_search on public.accounting_entries using gin(search_vector);
