create extension if not exists pgcrypto;

create table if not exists public.user_meta_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  encrypted_token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  ad_account_id text not null check (ad_account_id ~ '^[0-9]+$'),
  api_version text not null default 'v25.0' check (api_version ~ '^v[0-9]+\.[0-9]+$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_identities (
  user_id uuid primary key references auth.users(id) on delete cascade,
  document_type text not null check (document_type in ('cpf', 'cnpj')),
  document_hash text not null unique,
  document_last4 text not null check (char_length(document_last4) = 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_ai_keys (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('anthropic', 'openai', 'gemini')),
  encrypted_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

create index if not exists user_clients_user_id_idx on public.user_clients (user_id);
create index if not exists user_ai_keys_user_id_idx on public.user_ai_keys (user_id);

alter table public.user_clients alter column api_version set default 'v25.0';

alter table public.user_meta_tokens enable row level security;
alter table public.user_clients enable row level security;
alter table public.user_identities enable row level security;
alter table public.user_ai_keys enable row level security;

drop policy if exists "user_meta_tokens_select_own" on public.user_meta_tokens;
create policy "user_meta_tokens_select_own" on public.user_meta_tokens
for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "user_meta_tokens_insert_own" on public.user_meta_tokens;
create policy "user_meta_tokens_insert_own" on public.user_meta_tokens
for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "user_meta_tokens_update_own" on public.user_meta_tokens;
create policy "user_meta_tokens_update_own" on public.user_meta_tokens
for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "user_meta_tokens_delete_own" on public.user_meta_tokens;
create policy "user_meta_tokens_delete_own" on public.user_meta_tokens
for delete to authenticated
using (auth.uid() = user_id);

drop policy if exists "user_clients_select_own" on public.user_clients;
create policy "user_clients_select_own" on public.user_clients
for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "user_clients_insert_own" on public.user_clients;
create policy "user_clients_insert_own" on public.user_clients
for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "user_clients_update_own" on public.user_clients;
create policy "user_clients_update_own" on public.user_clients
for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "user_clients_delete_own" on public.user_clients;
create policy "user_clients_delete_own" on public.user_clients
for delete to authenticated
using (auth.uid() = user_id);

drop policy if exists "user_identities_select_own" on public.user_identities;
create policy "user_identities_select_own" on public.user_identities
for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "user_identities_insert_own" on public.user_identities;
create policy "user_identities_insert_own" on public.user_identities
for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "user_identities_update_own" on public.user_identities;
create policy "user_identities_update_own" on public.user_identities
for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "user_identities_delete_own" on public.user_identities;
create policy "user_identities_delete_own" on public.user_identities
for delete to authenticated
using (auth.uid() = user_id);

drop policy if exists "user_ai_keys_select_own" on public.user_ai_keys;
create policy "user_ai_keys_select_own" on public.user_ai_keys
for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "user_ai_keys_insert_own" on public.user_ai_keys;
create policy "user_ai_keys_insert_own" on public.user_ai_keys
for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "user_ai_keys_update_own" on public.user_ai_keys;
create policy "user_ai_keys_update_own" on public.user_ai_keys
for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "user_ai_keys_delete_own" on public.user_ai_keys;
create policy "user_ai_keys_delete_own" on public.user_ai_keys
for delete to authenticated
using (auth.uid() = user_id);
