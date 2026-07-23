-- VPNS Supabase schema v6 - format de numerotation des factures
-- Aligne le numero de facture genere automatiquement sur le modele officiel
-- utilise par l'entreprise (ex: "02/DG/VPNS/2026") au lieu de l'ancien format
-- interne "FAC-2026-001". La regle "jamais reutilise, jamais saute" (sequence
-- Postgres) est conservee - seul le format d'affichage change.
-- Idempotent. A executer APRES schema_v5_isolation_donnees.sql.

create or replace function public.generate_invoice_number()
returns trigger
language plpgsql
as $$
begin
  if new.invoice_number is null or new.invoice_number = '' then
    new.invoice_number := lpad(nextval('public.invoice_number_seq')::text, 2, '0') || '/DG/VPNS/' || to_char(now(), 'YYYY');
  end if;
  return new;
end;
$$;

-- NB: la facture "02/DG/VPNS/2026" (Cartouche Market, juin 2026) a ete creee
-- manuellement en dehors de l'application. Pour que le premier numero genere
-- automatiquement par l'app soit "03" et evite un doublon avec cette facture
-- deja emise, la sequence redemarre a 3 ci-dessous. Si d'autres factures ont
-- ete emises manuellement entre-temps (03, 04...), ajustez cette valeur avant
-- d'executer ce script.
alter sequence public.invoice_number_seq restart with 3;
