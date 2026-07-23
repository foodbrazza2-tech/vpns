-- VPNS Supabase schema v5 - cloisonnement des donnees par utilisateur
-- Jusqu'ici, toute politique RLS etait "to authenticated using (true)" : n'importe
-- quel compte connecte voit et modifie TOUT. Ca marche pour un seul utilisateur,
-- mais des qu'un 2e compte existe (collaborateur), il faut que chacun ne voie que
-- ses propres donnees. On ajoute une colonne owner_id (rempli automatiquement par
-- l'identifiant de l'utilisateur connecte) et on scope chaque politique dessus.
-- Idempotent. A executer APRES schema_v4_comptabilisation_auto.sql.

-- ═══════════════════════════════════════════
-- Fonction utilitaire : ajoute owner_id + son index + ses 4 politiques
-- CRUD scopees, en remplacement des anciennes politiques "using (true)".
-- ═══════════════════════════════════════════
do $$
declare
  t text;
  tables text[] := array[
    'clients', 'invoices', 'invoice_payments', 'accounting_entries',
    'events', 'reports', 'notifications', 'client_archives',
    'archive_documents', 'error_logs'
  ];
begin
  foreach t in array tables loop
    execute format('alter table public.%I add column if not exists owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade', t);
    execute format('create index if not exists idx_%s_owner_id on public.%I(owner_id)', t, t);
  end loop;
end $$;

-- CLIENTS
drop policy if exists clients_all_authenticated on public.clients;
create policy clients_owner_select on public.clients for select to authenticated using (owner_id = auth.uid());
create policy clients_owner_insert on public.clients for insert to authenticated with check (owner_id = auth.uid());
create policy clients_owner_update on public.clients for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy clients_owner_delete on public.clients for delete to authenticated using (owner_id = auth.uid());

-- INVOICES
drop policy if exists invoices_all_authenticated on public.invoices;
create policy invoices_owner_select on public.invoices for select to authenticated using (owner_id = auth.uid());
create policy invoices_owner_insert on public.invoices for insert to authenticated with check (owner_id = auth.uid());
create policy invoices_owner_update on public.invoices for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy invoices_owner_delete on public.invoices for delete to authenticated using (owner_id = auth.uid());

-- INVOICE_PAYMENTS
drop policy if exists invoice_payments_all_authenticated on public.invoice_payments;
create policy invoice_payments_owner_select on public.invoice_payments for select to authenticated using (owner_id = auth.uid());
create policy invoice_payments_owner_insert on public.invoice_payments for insert to authenticated with check (owner_id = auth.uid());
create policy invoice_payments_owner_update on public.invoice_payments for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy invoice_payments_owner_delete on public.invoice_payments for delete to authenticated using (owner_id = auth.uid());

-- ACCOUNTING_ENTRIES
drop policy if exists accounting_entries_all_authenticated on public.accounting_entries;
create policy accounting_entries_owner_select on public.accounting_entries for select to authenticated using (owner_id = auth.uid());
create policy accounting_entries_owner_insert on public.accounting_entries for insert to authenticated with check (owner_id = auth.uid());
create policy accounting_entries_owner_update on public.accounting_entries for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy accounting_entries_owner_delete on public.accounting_entries for delete to authenticated using (owner_id = auth.uid());

-- EVENTS
drop policy if exists events_all_authenticated on public.events;
create policy events_owner_select on public.events for select to authenticated using (owner_id = auth.uid());
create policy events_owner_insert on public.events for insert to authenticated with check (owner_id = auth.uid());
create policy events_owner_update on public.events for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy events_owner_delete on public.events for delete to authenticated using (owner_id = auth.uid());

-- REPORTS
drop policy if exists reports_all_authenticated on public.reports;
create policy reports_owner_select on public.reports for select to authenticated using (owner_id = auth.uid());
create policy reports_owner_insert on public.reports for insert to authenticated with check (owner_id = auth.uid());
create policy reports_owner_update on public.reports for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy reports_owner_delete on public.reports for delete to authenticated using (owner_id = auth.uid());

-- NOTIFICATIONS
drop policy if exists notifications_all_authenticated on public.notifications;
create policy notifications_owner_select on public.notifications for select to authenticated using (owner_id = auth.uid());
create policy notifications_owner_insert on public.notifications for insert to authenticated with check (owner_id = auth.uid());
create policy notifications_owner_update on public.notifications for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy notifications_owner_delete on public.notifications for delete to authenticated using (owner_id = auth.uid());

-- CLIENT_ARCHIVES
drop policy if exists client_archives_select_authenticated on public.client_archives;
drop policy if exists client_archives_insert_authenticated on public.client_archives;
drop policy if exists client_archives_update_authenticated on public.client_archives;
drop policy if exists client_archives_delete_authenticated on public.client_archives;
create policy client_archives_owner_select on public.client_archives for select to authenticated using (owner_id = auth.uid());
create policy client_archives_owner_insert on public.client_archives for insert to authenticated with check (owner_id = auth.uid());
create policy client_archives_owner_update on public.client_archives for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy client_archives_owner_delete on public.client_archives for delete to authenticated using (owner_id = auth.uid());

-- ARCHIVE_DOCUMENTS
drop policy if exists archive_documents_select_authenticated on public.archive_documents;
drop policy if exists archive_documents_insert_authenticated on public.archive_documents;
drop policy if exists archive_documents_update_authenticated on public.archive_documents;
drop policy if exists archive_documents_delete_authenticated on public.archive_documents;
create policy archive_documents_owner_select on public.archive_documents for select to authenticated using (owner_id = auth.uid());
create policy archive_documents_owner_insert on public.archive_documents for insert to authenticated with check (owner_id = auth.uid());
create policy archive_documents_owner_update on public.archive_documents for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy archive_documents_owner_delete on public.archive_documents for delete to authenticated using (owner_id = auth.uid());

-- ERROR_LOGS (on garde select restreint au proprietaire ; insert reste ouvert a
-- tout authentifie pour que l'ErrorBoundary puisse toujours logguer une erreur)
drop policy if exists error_logs_insert_authenticated on public.error_logs;
drop policy if exists error_logs_select_authenticated on public.error_logs;
create policy error_logs_owner_select on public.error_logs for select to authenticated using (owner_id = auth.uid());
create policy error_logs_insert_authenticated on public.error_logs for insert to authenticated with check (true);

-- NB: le bucket de stockage "archives" reste protege par authentification (voir
-- schema.sql) mais pas encore cloisonne par utilisateur au niveau des fichiers -
-- limitation connue, a traiter si plusieurs comptes utilisent l'archivage.

-- ═══════════════════════════════════════════
-- ANNULATION DE FACTURE (au lieu de suppression)
-- Une facture deja comptabilisee ne doit jamais etre supprimee : on l'annule
-- (statut 'cancelled'), ce qui contre-passe ses ecritures generees automatiquement.
-- ═══════════════════════════════════════════
alter table public.invoices drop constraint if exists invoices_status_check;
alter table public.invoices add constraint invoices_status_check
  check (status in ('draft', 'sent', 'paid', 'overdue', 'cancelled'));

-- ═══════════════════════════════════════════
-- JOURNAL D'AUDIT PERSISTANT
-- Remplace le tableau en memoire (securityService.ts) qui disparaissait au
-- rechargement. Trace les connexions (succes/echec) et actions sensibles.
-- ═══════════════════════════════════════════
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  action text not null,
  status text not null default 'success' check (status in ('success', 'failure', 'warning')),
  details jsonb,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_owner_id on public.audit_logs(owner_id);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);

alter table public.audit_logs enable row level security;
-- Lecture : uniquement ses propres logs.
drop policy if exists audit_logs_owner_select on public.audit_logs;
create policy audit_logs_owner_select on public.audit_logs for select to authenticated using (owner_id = auth.uid());
-- Ecriture : un echec de connexion se produit AVANT authentification reussie,
-- donc l'insertion doit rester ouverte a "anon" (utilisateur pas encore connecte)
-- en plus de "authenticated", sinon on ne peut jamais logguer un mot de passe faux.
drop policy if exists audit_logs_insert_anon on public.audit_logs;
create policy audit_logs_insert_anon on public.audit_logs for insert to anon with check (true);
drop policy if exists audit_logs_insert_authenticated on public.audit_logs;
create policy audit_logs_insert_authenticated on public.audit_logs for insert to authenticated with check (true);
