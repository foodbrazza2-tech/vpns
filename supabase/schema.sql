-- VPNS Supabase full-stack schema
-- Run this script in Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.client_archives (
  id uuid primary key default gen_random_uuid(),
  client_id text not null unique,
  client_name text not null,
  folder_path text not null,
  document_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.archive_documents (
  id uuid primary key default gen_random_uuid(),
  client_id text not null references public.client_archives(client_id) on delete cascade,
  file_name text not null,
  file_size bigint not null,
  file_type text not null,
  category text not null,
  description text,
  tags text[] default '{}',
  storage_path text not null,
  storage_bucket text not null default 'archives',
  uploaded_by uuid references auth.users(id) on delete set null,
  upload_date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_client_archives_client_id on public.client_archives(client_id);
create index if not exists idx_archive_documents_client_id on public.archive_documents(client_id);
create index if not exists idx_archive_documents_upload_date on public.archive_documents(upload_date desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_client_archives_updated_at on public.client_archives;
create trigger trg_client_archives_updated_at
before update on public.client_archives
for each row
execute function public.set_updated_at();

alter table public.client_archives enable row level security;
alter table public.archive_documents enable row level security;

-- Policies: authenticated users can read/write archive data.
-- Tighten these policies later with tenant-based constraints if needed.
drop policy if exists client_archives_select_authenticated on public.client_archives;
create policy client_archives_select_authenticated
on public.client_archives
for select
to authenticated
using (true);

drop policy if exists client_archives_insert_authenticated on public.client_archives;
create policy client_archives_insert_authenticated
on public.client_archives
for insert
to authenticated
with check (true);

drop policy if exists client_archives_update_authenticated on public.client_archives;
create policy client_archives_update_authenticated
on public.client_archives
for update
to authenticated
using (true)
with check (true);

drop policy if exists client_archives_delete_authenticated on public.client_archives;
create policy client_archives_delete_authenticated
on public.client_archives
for delete
to authenticated
using (true);

drop policy if exists archive_documents_select_authenticated on public.archive_documents;
create policy archive_documents_select_authenticated
on public.archive_documents
for select
to authenticated
using (true);

drop policy if exists archive_documents_insert_authenticated on public.archive_documents;
create policy archive_documents_insert_authenticated
on public.archive_documents
for insert
to authenticated
with check (true);

drop policy if exists archive_documents_update_authenticated on public.archive_documents;
create policy archive_documents_update_authenticated
on public.archive_documents
for update
to authenticated
using (true)
with check (true);

drop policy if exists archive_documents_delete_authenticated on public.archive_documents;
create policy archive_documents_delete_authenticated
on public.archive_documents
for delete
to authenticated
using (true);

insert into storage.buckets (id, name, public)
values ('archives', 'archives', false)
on conflict (id) do nothing;

-- Storage policies
drop policy if exists "archives bucket select" on storage.objects;
create policy "archives bucket select"
on storage.objects
for select
to authenticated
using (bucket_id = 'archives');

drop policy if exists "archives bucket insert" on storage.objects;
create policy "archives bucket insert"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'archives');

drop policy if exists "archives bucket update" on storage.objects;
create policy "archives bucket update"
on storage.objects
for update
to authenticated
using (bucket_id = 'archives')
with check (bucket_id = 'archives');

drop policy if exists "archives bucket delete" on storage.objects;
create policy "archives bucket delete"
on storage.objects
for delete
to authenticated
using (bucket_id = 'archives');
