-- UTime: escala Sono/Humor 0–10, notas opcionais e meta de sono.
-- Idempotente. Preserva dados. Converte legado 1–5 → 0–10 (×2) e recalcula scores.

-- Preferência de meta de sono
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

-- Colunas de observação
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

-- Converter qualidade/nível legado 1–5 → 0–10 e scores
alter table public.sleep_checkins drop constraint if exists sleep_checkins_quality_valid;
alter table public.mood_checkins drop constraint if exists mood_checkins_level_valid;
alter table public.mood_checkins drop constraint if exists mood_checkins_score_valid;

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

-- Reaplicar constraints 0–10
alter table public.sleep_checkins
  add constraint sleep_checkins_quality_valid check (quality between 0 and 10);

alter table public.mood_checkins
  add constraint mood_checkins_level_valid check (level between 0 and 10);

alter table public.mood_checkins
  add constraint mood_checkins_score_valid check (score >= 0 and score <= 100);

-- Seed metas a partir do último goal_hours registrado
insert into public.sleep_preferences (user_id, goal_hours, updated_at)
select distinct on (user_id) user_id, goal_hours, now()
from public.sleep_checkins
order by user_id, updated_at desc
on conflict (user_id) do nothing;
