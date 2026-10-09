-- UTime: meta e consumo de água por usuário e data.
-- Execute este arquivo manualmente no SQL Editor do Supabase, depois de supabase/schema.sql.
-- A meta começa vazia. O arquivo não grava 3000 ml nem qualquer valor padrão de meta.
-- Não altera habit_day_logs, user_habits, habit_catalog, profiles, journey_days,
-- journey_state, ranking nem os registros já gravados.

create table if not exists public.hydration_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  occurred_on date not null,
  goal_ml integer,
  consumed_ml integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, occurred_on),
  constraint hydration_days_goal_valid check (goal_ml is null or goal_ml > 0),
  constraint hydration_days_consumed_valid check (consumed_ml >= 0)
);

drop trigger if exists hydration_days_set_updated_at on public.hydration_days;
create trigger hydration_days_set_updated_at
before update on public.hydration_days
for each row execute function public.set_updated_at();

alter table public.hydration_days enable row level security;

revoke all on table public.hydration_days from public, anon;
grant select, insert, update, delete on table public.hydration_days to authenticated;

drop policy if exists hydration_days_select_own on public.hydration_days;
create policy hydration_days_select_own
on public.hydration_days
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists hydration_days_insert_own on public.hydration_days;
create policy hydration_days_insert_own
on public.hydration_days
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists hydration_days_update_own on public.hydration_days;
create policy hydration_days_update_own
on public.hydration_days
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists hydration_days_delete_own on public.hydration_days;
create policy hydration_days_delete_own
on public.hydration_days
for delete
to authenticated
using (auth.uid() = user_id);
