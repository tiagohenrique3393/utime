-- UTime | SQL consolidado: gráficos + check-ins 0–10
-- Idempotente. Sem RESET. Preserva dados. Executar uma vez no SQL Editor do projeto oficial.
-- Inclui: habit_completion_events (se ainda ausente), sleep_preferences, notas,
-- conversão legado 1–5 → 0–10, constraints e exclusão de conta compatível.

-- ═══════════════════════════════════════════════════════════════
-- 1) Eventos intradía de conclusão de hábitos (gráfico DIA)
-- ═══════════════════════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════════════════════
-- 2) Preferência de meta de sono + notas + escala 0–10
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.sleep_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  goal_hours numeric(4, 1) not null default 8,
  updated_at timestamptz not null default now(),
  constraint sleep_preferences_goal_valid check (goal_hours > 0 and goal_hours <= 24)
);

alter table public.sleep_preferences enable row level security;
revoke all on table public.sleep_preferences from public, anon;
grant select, insert, update, delete on table public.sleep_preferences to authenticated;

drop policy if exists sleep_preferences_select_own on public.sleep_preferences;
create policy sleep_preferences_select_own
on public.sleep_preferences for select to authenticated
using (auth.uid() = user_id);

drop policy if exists sleep_preferences_insert_own on public.sleep_preferences;
create policy sleep_preferences_insert_own
on public.sleep_preferences for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists sleep_preferences_update_own on public.sleep_preferences;
create policy sleep_preferences_update_own
on public.sleep_preferences for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists sleep_preferences_delete_own on public.sleep_preferences;
create policy sleep_preferences_delete_own
on public.sleep_preferences for delete to authenticated
using (auth.uid() = user_id);

drop policy if exists sleep_preferences_upsert_own on public.sleep_preferences;

alter table public.sleep_checkins add column if not exists note text;
alter table public.mood_checkins add column if not exists note text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'sleep_checkins_note_len'
  ) then
    alter table public.sleep_checkins
      add constraint sleep_checkins_note_len check (note is null or char_length(note) <= 500);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'mood_checkins_note_len'
  ) then
    alter table public.mood_checkins
      add constraint mood_checkins_note_len check (note is null or char_length(note) <= 500);
  end if;
end $$;

alter table public.sleep_checkins drop constraint if exists sleep_checkins_quality_valid;
alter table public.mood_checkins drop constraint if exists mood_checkins_level_valid;
alter table public.mood_checkins drop constraint if exists mood_checkins_score_valid;

-- Converte legado 1–5 → 0–10 (×2) e recalcula scores.
-- RHS usa valores antigos: quality/level ainda 1–5 neste UPDATE.
update public.sleep_checkins
set
  score = round((
    least(100::numeric, (hours / nullif(goal_hours, 0)) * 100)
    + ((quality * 2) * 10)
  ) / 2, 2),
  quality = quality * 2
where quality between 1 and 5;

update public.mood_checkins
set
  score = (level * 2) * 10,
  level = level * 2
where level between 1 and 5;

alter table public.sleep_checkins
  add constraint sleep_checkins_quality_valid check (quality between 0 and 10);

alter table public.mood_checkins
  add constraint mood_checkins_level_valid check (level between 0 and 10);

alter table public.mood_checkins
  add constraint mood_checkins_score_valid check (score >= 0 and score <= 100);

insert into public.sleep_preferences (user_id, goal_hours, updated_at)
select distinct on (user_id) user_id, goal_hours, now()
from public.sleep_checkins
order by user_id, updated_at desc
on conflict (user_id) do nothing;

-- ═══════════════════════════════════════════════════════════════
-- 3) Confirmação rápida (opcional)
-- ═══════════════════════════════════════════════════════════════
-- select
--   to_regclass('public.habit_completion_events') as habit_events,
--   to_regclass('public.sleep_preferences') as sleep_prefs,
--   (select count(*) from public.sleep_checkins where quality between 0 and 10) as sleep_ok,
--   (select count(*) from public.mood_checkins where level between 0 and 10) as mood_ok;
