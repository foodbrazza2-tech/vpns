-- VPNS Supabase schema v7 - memoire persistante de l'assistant comptable
-- Aujourd'hui, la conversation du chat ne vit que dans l'etat React : fermer
-- l'onglet ou recharger la page efface tout, ce qui contredit l'idee meme
-- d'un "assistant de poche" qui se souvient de ce qui a ete dit. Cette table
-- persiste l'historique, scope par utilisateur comme le reste de l'app (voir
-- schema_v5_isolation_donnees.sql pour le meme pattern owner_id/RLS).
-- Idempotent.

create extension if not exists pgcrypto;

create table if not exists public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'model')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_assistant_messages_owner_created on public.assistant_messages(owner_id, created_at);

alter table public.assistant_messages enable row level security;

drop policy if exists assistant_messages_owner_select on public.assistant_messages;
create policy assistant_messages_owner_select on public.assistant_messages for select to authenticated using (owner_id = auth.uid());

drop policy if exists assistant_messages_owner_insert on public.assistant_messages;
create policy assistant_messages_owner_insert on public.assistant_messages for insert to authenticated with check (owner_id = auth.uid());

-- Necessaire pour le bouton "Nouvelle conversation" (efface son propre
-- historique) - jamais de update, un message une fois ecrit ne change pas.
drop policy if exists assistant_messages_owner_delete on public.assistant_messages;
create policy assistant_messages_owner_delete on public.assistant_messages for delete to authenticated using (owner_id = auth.uid());
