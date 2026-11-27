-- =============================================================================
-- UTime PRODUÇÃO — Eventos intradía de hábitos (gráfico DIA em degraus)
-- Colar no SQL Editor do Supabase. Idempotente. RLS own-rows.
-- Não enfraquece Premium. Sem backfill de horários históricos.
-- Depois deste arquivo, reexecute também o trecho de delete_own_account em
-- supabase/delete-account.sql (ou o bloco DELETE abaixo) para cascade.
-- =============================================================================

create table if not exists public.habit_completion_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  user_habit_id uuid not null references public.user_habits (id) on delete cascade,
  occurred_on date not null,
  completed boolean not null,
  recorded_at timestamptz not null default now()
);

create index if not exists habit_completion_events_day_idx
  on public.habit_completion_events (user_id, occurred_on, recorded_at);

alter table public.habit_completion_events enable row level security;

revoke all on table public.habit_completion_events from public, anon;
grant select, insert, delete on table public.habit_completion_events to authenticated;

drop policy if exists habit_completion_events_select_own on public.habit_completion_events;
create policy habit_completion_events_select_own
on public.habit_completion_events
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists habit_completion_events_insert_own on public.habit_completion_events;
create policy habit_completion_events_insert_own
on public.habit_completion_events
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.user_habits
    where user_habits.id = user_habit_id
      and user_habits.user_id = auth.uid()
  )
);

drop policy if exists habit_completion_events_delete_own on public.habit_completion_events;
create policy habit_completion_events_delete_own
on public.habit_completion_events
for delete
to authenticated
using (auth.uid() = user_id);

-- Cascade na exclusão de conta (trecho seguro / idempotente)
-- Se a função delete_own_account já existir, reaplicar supabase/delete-account.sql completo.
