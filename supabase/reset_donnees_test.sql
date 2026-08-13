-- Reinitialisation complete des donnees de test - VPNS Consulting
-- ATTENTION : IRREVERSIBLE. Supprime toutes les lignes de toutes les tables
-- metier (clients, factures, ecritures, agenda, rapports, notifications,
-- paiements, memoire de l'assistant, journal d'erreurs, metadonnees
-- d'archives). Ne touche PAS aux tables elles-memes ni aux policies RLS :
-- l'application continue de fonctionner normalement juste avec des donnees
-- vides, comme au premier lancement.
--
-- A executer toi-meme dans Supabase (SQL Editor -> New query -> coller -> Run).
-- Je ne l'execute jamais moi-meme : la suppression definitive de donnees est
-- une des rares actions que je ne fais jamais a la place de l'utilisateur,
-- meme sur demande explicite.
--
-- NOTE : les fichiers reellement uploades dans le stockage Supabase (photos
-- de documents archives) ne sont PAS supprimes par ce script - seules les
-- lignes de metadonnees qui les referencent le sont. Si tu veux aussi vider
-- les fichiers stockes, fais-le separement dans Supabase -> Storage -> bucket
-- "archives" -> supprimer les fichiers.

truncate table
  public.invoice_payments,
  public.accounting_entries,
  public.invoices,
  public.clients,
  public.events,
  public.reports,
  public.notifications,
  public.assistant_messages,
  public.error_logs,
  public.archive_documents,
  public.client_archives
cascade;

-- Remet la numerotation des factures a 1 (sinon la prochaine facture
-- s'appellerait "04/DG/VPNS/2026" au lieu de repartir de "01/...").
alter sequence if exists public.invoice_number_seq restart with 1;
