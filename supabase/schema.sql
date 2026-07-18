-- ============================================================================
-- Schema para o app do Ministério de Louvor
-- Execute este arquivo inteiro no SQL Editor do seu projeto Supabase.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extensões
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Tabela: profiles
-- Um perfil por usuário autenticado. Criado automaticamente no cadastro.
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role text not null default 'membro' check (role in ('admin', 'lider', 'membro')),
  instruments text[] not null default '{}',
  phone text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Helper: verifica se o usuário logado é admin ou líder (sem recursão de RLS).
create or replace function public.is_leader_or_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'lider')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Cria o profile automaticamente quando um usuário se cadastra.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Impede que um membro comum promova a si mesmo a admin/lider.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    new.role := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role_trigger on public.profiles;
create trigger protect_profile_role_trigger
  before update on public.profiles
  for each row execute function public.protect_profile_role();

create policy "profiles: leitura para autenticados"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles: usuário edita o próprio perfil"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- ----------------------------------------------------------------------------
-- Tabela: songs (repertório)
-- ----------------------------------------------------------------------------
create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text,
  default_key text,
  bpm integer,
  lyrics_chords text not null default '',
  youtube_url text,
  spotify_url text,
  tags text[] not null default '{}',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.songs enable row level security;

create policy "songs: leitura para autenticados"
  on public.songs for select
  to authenticated
  using (true);

create policy "songs: escrita para líder/admin"
  on public.songs for insert
  to authenticated
  with check (public.is_leader_or_admin());

create policy "songs: atualização para líder/admin"
  on public.songs for update
  to authenticated
  using (public.is_leader_or_admin())
  with check (public.is_leader_or_admin());

create policy "songs: exclusão para líder/admin"
  on public.songs for delete
  to authenticated
  using (public.is_leader_or_admin());

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists songs_set_updated_at on public.songs;
create trigger songs_set_updated_at
  before update on public.songs
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Tabela: services (cultos / ensaios / eventos)
-- ----------------------------------------------------------------------------
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  service_date date not null,
  service_time time,
  type text not null default 'culto' check (type in ('culto', 'ensaio', 'evento')),
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.services enable row level security;

create policy "services: leitura para autenticados"
  on public.services for select
  to authenticated
  using (true);

create policy "services: escrita para líder/admin"
  on public.services for insert
  to authenticated
  with check (public.is_leader_or_admin());

create policy "services: atualização para líder/admin"
  on public.services for update
  to authenticated
  using (public.is_leader_or_admin())
  with check (public.is_leader_or_admin());

create policy "services: exclusão para líder/admin"
  on public.services for delete
  to authenticated
  using (public.is_leader_or_admin());

-- ----------------------------------------------------------------------------
-- Tabela: service_songs (roteiro do culto)
-- ----------------------------------------------------------------------------
create table if not exists public.service_songs (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete cascade,
  position integer not null default 0,
  key_override text,
  notes text
);

alter table public.service_songs enable row level security;

create policy "service_songs: leitura para autenticados"
  on public.service_songs for select
  to authenticated
  using (true);

create policy "service_songs: escrita para líder/admin"
  on public.service_songs for insert
  to authenticated
  with check (public.is_leader_or_admin());

create policy "service_songs: atualização para líder/admin"
  on public.service_songs for update
  to authenticated
  using (public.is_leader_or_admin())
  with check (public.is_leader_or_admin());

create policy "service_songs: exclusão para líder/admin"
  on public.service_songs for delete
  to authenticated
  using (public.is_leader_or_admin());

-- ----------------------------------------------------------------------------
-- Tabela: service_team (escala de voluntários)
-- ----------------------------------------------------------------------------
create table if not exists public.service_team (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null,
  status text not null default 'convidado' check (status in ('convidado', 'confirmado', 'recusado')),
  created_at timestamptz not null default now(),
  unique (service_id, profile_id, role)
);

alter table public.service_team enable row level security;

create policy "service_team: leitura para autenticados"
  on public.service_team for select
  to authenticated
  using (true);

create policy "service_team: escrita para líder/admin"
  on public.service_team for insert
  to authenticated
  with check (public.is_leader_or_admin());

create policy "service_team: atualização por líder/admin ou pelo próprio membro"
  on public.service_team for update
  to authenticated
  using (public.is_leader_or_admin() or profile_id = auth.uid())
  with check (public.is_leader_or_admin() or profile_id = auth.uid());

create policy "service_team: exclusão para líder/admin"
  on public.service_team for delete
  to authenticated
  using (public.is_leader_or_admin());

-- ----------------------------------------------------------------------------
-- Índices
-- ----------------------------------------------------------------------------
create index if not exists idx_service_songs_service on public.service_songs (service_id, position);
create index if not exists idx_service_team_service on public.service_team (service_id);
create index if not exists idx_services_date on public.services (service_date);

-- ----------------------------------------------------------------------------
-- Pós-instalação: promova o primeiro usuário a admin manualmente, ex.:
-- update public.profiles set role = 'admin' where id = '<uuid-do-usuario>';
-- ----------------------------------------------------------------------------
