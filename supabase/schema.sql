-- YouTime: perfil, checklist e histórico de 30 dias.
-- Execute este arquivo uma vez no SQL Editor do Supabase.
-- O aplicativo só tem a chave publicável e não consegue criar tabelas.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null default '',
  journey text,
  goals text[] not null default '{}',
  onboarding_completed boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint profiles_journey_valid check (
    journey is null or journey in ('metime', 'womantime')
  ),
  constraint profiles_goals_valid check (
    goals <@ array['disciplina', 'corpo', 'mente', 'espirito', 'rotina']::text[]
  )
);

create table if not exists public.journey_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  test_mode boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.journey_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  day_number integer not null,
  completed_task_ids text[] not null default '{}',
  started boolean not null default false,
  progress_percent integer not null default 0,
  pillar_percents jsonb not null default '{"corpo":0,"mente":0,"espirito":0}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, day_number),
  constraint journey_days_number_valid check (day_number between 1 and 30),
  constraint journey_days_progress_valid check (progress_percent between 0 and 100)
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists journey_state_set_updated_at on public.journey_state;
create trigger journey_state_set_updated_at
before update on public.journey_state
for each row execute function public.set_updated_at();

drop trigger if exists journey_days_set_updated_at on public.journey_days;
create trigger journey_days_set_updated_at
before update on public.journey_days
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.journey_state enable row level security;
alter table public.journey_days enable row level security;

revoke all on table public.profiles from public, anon;
revoke all on table public.journey_state from public, anon;
revoke all on table public.journey_days from public, anon;

grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.journey_state to authenticated;
grant select, insert, update, delete on table public.journey_days to authenticated;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_delete_own
on public.profiles
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists journey_state_select_own on public.journey_state;
create policy journey_state_select_own
on public.journey_state
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists journey_state_insert_own on public.journey_state;
create policy journey_state_insert_own
on public.journey_state
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists journey_state_update_own on public.journey_state;
create policy journey_state_update_own
on public.journey_state
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists journey_state_delete_own on public.journey_state;
create policy journey_state_delete_own
on public.journey_state
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists journey_days_select_own on public.journey_days;
create policy journey_days_select_own
on public.journey_days
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists journey_days_insert_own on public.journey_days;
create policy journey_days_insert_own
on public.journey_days
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists journey_days_update_own on public.journey_days;
create policy journey_days_update_own
on public.journey_days
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists journey_days_delete_own on public.journey_days;
create policy journey_days_delete_own
on public.journey_days
for delete
to authenticated
using (auth.uid() = user_id);
