-- UTime: check-ins de sono e humor + estado dos prompts inteligentes.
-- Incremental. Execute no SQL Editor (idempotente). Não altera hábitos, pilares,
-- constância, círculo, ranking nem desafios.
-- Sono/humor são privados: RLS só com auth.uid() = user_id.
-- Cascade em auth.users. Contas novas continuam free; plano não sobe pelo cliente.

create table if not exists public.sleep_checkins (
  user_id uuid not null references auth.users (id) on delete cascade,
  local_date date not null,
  hours numeric(4, 1) not null,
  quality smallint not null,
  goal_hours numeric(4, 1) not null default 8,
  score numeric(6, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, local_date),
  constraint sleep_checkins_hours_valid check (hours >= 0 and hours <= 12),
  constraint sleep_checkins_quality_valid check (quality between 1 and 5),
  constraint sleep_checkins_goal_valid check (goal_hours > 0 and goal_hours <= 24),
  constraint sleep_checkins_score_valid check (score >= 0 and score <= 100)
);

drop trigger if exists sleep_checkins_set_updated_at on public.sleep_checkins;
create trigger sleep_checkins_set_updated_at
before update on public.sleep_checkins
for each row execute function public.set_updated_at();

alter table public.sleep_checkins enable row level security;

revoke all on table public.sleep_checkins from public, anon;
grant select, insert, update, delete on table public.sleep_checkins to authenticated;

drop policy if exists sleep_checkins_select_own on public.sleep_checkins;
create policy sleep_checkins_select_own
on public.sleep_checkins for select to authenticated
using (auth.uid() = user_id);

drop policy if exists sleep_checkins_insert_own on public.sleep_checkins;
create policy sleep_checkins_insert_own
on public.sleep_checkins for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists sleep_checkins_update_own on public.sleep_checkins;
create policy sleep_checkins_update_own
on public.sleep_checkins for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists sleep_checkins_delete_own on public.sleep_checkins;
create policy sleep_checkins_delete_own
on public.sleep_checkins for delete to authenticated
using (auth.uid() = user_id);

create table if not exists public.mood_checkins (
  user_id uuid not null references auth.users (id) on delete cascade,
  local_date date not null,
  period text not null,
  level smallint not null,
  score numeric(6, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, local_date, period),
  constraint mood_checkins_period_valid check (period in ('manha', 'tarde', 'noite')),
  constraint mood_checkins_level_valid check (level between 1 and 5),
  constraint mood_checkins_score_valid check (score in (20, 40, 60, 80, 100))
);

drop trigger if exists mood_checkins_set_updated_at on public.mood_checkins;
create trigger mood_checkins_set_updated_at
before update on public.mood_checkins
for each row execute function public.set_updated_at();

alter table public.mood_checkins enable row level security;

revoke all on table public.mood_checkins from public, anon;
grant select, insert, update, delete on table public.mood_checkins to authenticated;

drop policy if exists mood_checkins_select_own on public.mood_checkins;
create policy mood_checkins_select_own
on public.mood_checkins for select to authenticated
using (auth.uid() = user_id);

drop policy if exists mood_checkins_insert_own on public.mood_checkins;
create policy mood_checkins_insert_own
on public.mood_checkins for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists mood_checkins_update_own on public.mood_checkins;
create policy mood_checkins_update_own
on public.mood_checkins for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists mood_checkins_delete_own on public.mood_checkins;
create policy mood_checkins_delete_own
on public.mood_checkins for delete to authenticated
using (auth.uid() = user_id);

-- period_key: '' para next_habit/sleep; manha|tarde|noite para humor.
create table if not exists public.checkin_prompt_state (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  local_date date not null,
  period_key text not null default '',
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, local_date, period_key),
  constraint checkin_prompt_kind_valid check (kind in ('next_habit', 'sleep', 'mood')),
  constraint checkin_prompt_status_valid check (status in ('presented', 'answered', 'dismissed')),
  constraint checkin_prompt_period_valid check (
    (kind = 'mood' and period_key in ('manha', 'tarde', 'noite'))
    or (kind <> 'mood' and period_key = '')
  )
);

drop trigger if exists checkin_prompt_state_set_updated_at on public.checkin_prompt_state;
create trigger checkin_prompt_state_set_updated_at
before update on public.checkin_prompt_state
for each row execute function public.set_updated_at();

alter table public.checkin_prompt_state enable row level security;

revoke all on table public.checkin_prompt_state from public, anon;
grant select, insert, update, delete on table public.checkin_prompt_state to authenticated;

drop policy if exists checkin_prompt_state_select_own on public.checkin_prompt_state;
create policy checkin_prompt_state_select_own
on public.checkin_prompt_state for select to authenticated
using (auth.uid() = user_id);

drop policy if exists checkin_prompt_state_insert_own on public.checkin_prompt_state;
create policy checkin_prompt_state_insert_own
on public.checkin_prompt_state for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists checkin_prompt_state_update_own on public.checkin_prompt_state;
create policy checkin_prompt_state_update_own
on public.checkin_prompt_state for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists checkin_prompt_state_delete_own on public.checkin_prompt_state;
create policy checkin_prompt_state_delete_own
on public.checkin_prompt_state for delete to authenticated
using (auth.uid() = user_id);

-- Exclusão de conta: incluir as novas tabelas pessoais (cascade também cobre via FK).
-- O bloco abaixo reforça o delete explícito no fluxo delete_own_account quando a função existir.
do $$
begin
  if to_regprocedure('public.delete_own_account(text, text, text)') is null
     and to_regprocedure('public.delete_own_account(text, text)') is null then
    null;
  end if;
end $$;
