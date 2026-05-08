-- API Keys table for agent/programmatic access

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  seller_identity_id uuid references public.seller_identities(id) on delete set null,
  name text not null,
  key_hash text not null unique,
  scopes text[] not null default '{}',
  is_active boolean not null default true,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

alter table public.api_keys enable row level security;

-- Owners can see their own keys
create policy "owners can view own api keys"
  on public.api_keys for select
  using (auth.uid() = profile_id);

-- Owners can create keys
create policy "owners can create api keys"
  on public.api_keys for insert
  with check (auth.uid() = profile_id);

-- Owners can update (deactivate) their own keys
create policy "owners can update own api keys"
  on public.api_keys for update
  using (auth.uid() = profile_id);

-- Owners can delete their own keys
create policy "owners can delete own api keys"
  on public.api_keys for delete
  using (auth.uid() = profile_id);

create index api_keys_profile_id_idx on public.api_keys(profile_id);
create index api_keys_key_hash_idx on public.api_keys(key_hash);
