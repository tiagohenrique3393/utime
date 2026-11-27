-- =============================================================================
-- UTime | SQL ÚNICO DE PRODUÇÃO
-- Gráficos (habit_completion_events) + check-ins inteligentes Sono/Humor 0–10
-- + sleep_preferences + notas + exclusão de conta compatível
-- =============================================================================
-- Projeto: svsxqpejzqejcvlshost (oficial)
-- Frontend publicado: utime.app.br @ commit 2a685b1 (PR #9)
--
-- Propriedades:
--   • Idempotente (pode rodar de novo sem duplicar nem re-escalar)
--   • Transacional (BEGIN/COMMIT)
--   • Sem RESET / TRUNCATE / DROP TABLE de dados
--   • Não altera Premium, vitalícios, hábitos, ranking, desafios, círculos
--   • Converte legado 1–5 → 0–10 (×2) preservando o significado da nota
--
-- Como usar: colar este arquivo inteiro no SQL Editor do Supabase → Run
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 0) Marcador de migrations (idempotência da conversão de escala)
-- -----------------------------------------------------------------------------
create table if not exists public.utime_schema_migrations (
  id text primary key,
  applied_at timestamptz not null default now()
);

alter table public.utime_schema_migrations enable row level security;
revoke all on table public.utime_schema_migrations from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 1) Eventos intradía de conclusão de hábitos (gráfico DIA)
--    Já pode existir em produção; create if not exists é seguro.
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 2) Tabelas base de sono/humor/prompts (se ainda não existirem)
--    Em produção já existem; este bloco só cobre ambientes incompletos.
--    Constraints de escala são ajustadas no passo 4 (0–10).
-- -----------------------------------------------------------------------------
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
  constraint sleep_checkins_goal_valid check (goal_hours > 0 and goal_hours <= 24),
  constraint sleep_checkins_score_valid check (score >= 0 and score <= 100)
);

create table if not exists public.mood_checkins (
  user_id uuid not null references auth.users (id) on delete cascade,
  local_date date not null,
  period text not null,
  level smallint not null,
  score numeric(6, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, local_date, period),
  constraint mood_checkins_period_valid check (period in ('manha', 'tarde', 'noite'))
);

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

-- Triggers updated_at (se a função auxiliar existir)
do $$
begin
  if to_regprocedure('public.set_updated_at()') is not null then
    drop trigger if exists sleep_checkins_set_updated_at on public.sleep_checkins;
    create trigger sleep_checkins_set_updated_at
    before update on public.sleep_checkins
    for each row execute function public.set_updated_at();

    drop trigger if exists mood_checkins_set_updated_at on public.mood_checkins;
    create trigger mood_checkins_set_updated_at
    before update on public.mood_checkins
    for each row execute function public.set_updated_at();

    drop trigger if exists checkin_prompt_state_set_updated_at on public.checkin_prompt_state;
    create trigger checkin_prompt_state_set_updated_at
    before update on public.checkin_prompt_state
    for each row execute function public.set_updated_at();
  end if;
end $$;

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

-- -----------------------------------------------------------------------------
-- 3) Preferência individual de meta de sono + colunas note
-- -----------------------------------------------------------------------------
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
      add constraint sleep_checkins_note_len
      check (note is null or char_length(note) <= 500);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'mood_checkins_note_len'
  ) then
    alter table public.mood_checkins
      add constraint mood_checkins_note_len
      check (note is null or char_length(note) <= 500);
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 4) Escala 0–10 com conversão segura do legado 1–5
--    Regra: nota_nova = nota_antiga × 2  (1→2 … 5→10)
--    Score de humor antigo level×20 ≡ novo level×10 após ×2 (mesmo percentual)
--    Score de sono: média(duração%, qualidade×20) → média(duração%, qualidade×10)
-- -----------------------------------------------------------------------------
alter table public.sleep_checkins drop constraint if exists sleep_checkins_quality_valid;
alter table public.mood_checkins drop constraint if exists mood_checkins_level_valid;
alter table public.mood_checkins drop constraint if exists mood_checkins_score_valid;

do $$
declare
  already boolean;
  sleep_max numeric;
  mood_max numeric;
  sleep_converted integer := 0;
  mood_converted integer := 0;
begin
  select exists (
    select 1 from public.utime_schema_migrations where id = 'charts-checkins-0to10-v1'
  ) into already;

  if already then
    raise notice 'UTIME: conversão 0–10 já aplicada (marker charts-checkins-0to10-v1). Pulando UPDATE.';
  else
    select coalesce(max(quality), 0) into sleep_max from public.sleep_checkins;
    select coalesce(max(level), 0) into mood_max from public.mood_checkins;

    -- Sono: se o máximo ainda é ≤5, toda a tabela está na escala antiga.
    if sleep_max <= 5 then
      update public.sleep_checkins
      set
        score = round((
          least(100::numeric, (hours / nullif(goal_hours, 0)) * 100)
          + ((quality * 2) * 10)
        ) / 2, 2),
        quality = quality * 2
      where quality between 1 and 5;
      get diagnostics sleep_converted = row_count;
    else
      -- Mistura improvável: só converte linhas que ainda batem a fórmula legada.
      update public.sleep_checkins
      set
        score = round((
          least(100::numeric, (hours / nullif(goal_hours, 0)) * 100)
          + ((quality * 2) * 10)
        ) / 2, 2),
        quality = quality * 2
      where quality between 1 and 5
        and abs(
          score - round((
            least(100::numeric, (hours / nullif(goal_hours, 0)) * 100)
            + (quality * 20)
          ) / 2, 2)
        ) < 0.05;
      get diagnostics sleep_converted = row_count;
    end if;

    -- Humor: idem.
    if mood_max <= 5 then
      update public.mood_checkins
      set
        score = (level * 2) * 10,
        level = level * 2
      where level between 1 and 5;
      get diagnostics mood_converted = row_count;
    else
      update public.mood_checkins
      set
        score = (level * 2) * 10,
        level = level * 2
      where level between 1 and 5
        and score = (level * 20);
      get diagnostics mood_converted = row_count;
    end if;

    insert into public.utime_schema_migrations (id, applied_at)
    values ('charts-checkins-0to10-v1', now())
    on conflict (id) do nothing;

    raise notice 'UTIME: convertidos sleep=% mood=%', sleep_converted, mood_converted;
  end if;
end $$;

-- Constraints finais 0–10 (compatíveis com o frontend 2a685b1)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'sleep_checkins_quality_valid'
  ) then
    alter table public.sleep_checkins
      add constraint sleep_checkins_quality_valid check (quality between 0 and 10);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'mood_checkins_level_valid'
  ) then
    alter table public.mood_checkins
      add constraint mood_checkins_level_valid check (level between 0 and 10);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'mood_checkins_score_valid'
  ) then
    alter table public.mood_checkins
      add constraint mood_checkins_score_valid check (score >= 0 and score <= 100);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'sleep_checkins_score_valid'
  ) then
    alter table public.sleep_checkins
      add constraint sleep_checkins_score_valid check (score >= 0 and score <= 100);
  end if;
end $$;

-- Seed de metas a partir do último goal_hours registrado (não sobrescreve preferência existente)
insert into public.sleep_preferences (user_id, goal_hours, updated_at)
select distinct on (user_id) user_id, goal_hours, now()
from public.sleep_checkins
order by user_id, updated_at desc
on conflict (user_id) do nothing;

-- -----------------------------------------------------------------------------
-- 5) Exclusão de conta — contempla sleep/mood/preferences/events
--    Preserva ranking, desafios, catálogo e Premium.
-- -----------------------------------------------------------------------------
create table if not exists public.account_exit_survey (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  comment text,
  survey_version text not null,
  created_at timestamptz not null default now(),
  constraint account_exit_survey_category_valid check (
    category in (
      'prefer_not',
      'infrequent',
      'features',
      'premium_price',
      'other_app',
      'technical',
      'other'
    )
  ),
  constraint account_exit_survey_comment_len check (comment is null or char_length(comment) <= 2000),
  constraint account_exit_survey_version_len check (char_length(survey_version) between 1 and 16)
);

create index if not exists account_exit_survey_created_idx
  on public.account_exit_survey (created_at);

alter table public.account_exit_survey enable row level security;
revoke all on table public.account_exit_survey from public, anon, authenticated;

create or replace function public.sanitize_exit_comment(raw text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  cleaned text;
begin
  if raw is null then
    return null;
  end if;
  cleaned := btrim(raw);
  if cleaned = '' then
    return null;
  end if;
  if char_length(cleaned) > 2000 then
    cleaned := left(cleaned, 2000);
  end if;
  cleaned := regexp_replace(cleaned, '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[removido]', 'g');
  cleaned := regexp_replace(cleaned, '(?:\+?\d[\d\s().-]{7,}\d)', '[removido]', 'g');
  cleaned := btrim(regexp_replace(cleaned, '\s{2,}', ' ', 'g'));
  if cleaned = '' then
    return null;
  end if;
  return cleaned;
end;
$$;

revoke all on function public.sanitize_exit_comment(text) from public, anon, authenticated;

create or replace function public.purge_account_exit_survey()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.account_exit_survey
  set comment = null
  where comment is not null
    and created_at < pg_catalog.now() - interval '90 days';

  delete from public.account_exit_survey
  where created_at < pg_catalog.now() - interval '24 months';
end;
$$;

revoke all on function public.purge_account_exit_survey() from public, anon, authenticated;

create or replace function public.delete_own_account(
  reason text default null,
  note text default null,
  survey_version text default '1'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  issued numeric := nullif(coalesce(auth.jwt() ->> 'iat', ''), '')::numeric;
  category text := nullif(btrim(coalesce(reason, '')), '');
  version text := nullif(btrim(coalesce(survey_version, '')), '');
  cleaned text;
  blocker record;
  remaining bigint;
begin
  if uid is null
     or issued is null
     or to_timestamp(issued) < pg_catalog.now() - interval '10 minutes'
     or uid::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'auth required' using errcode = '28000';
  end if;

  if not exists (select 1 from auth.users where id = uid) then
    raise exception 'account missing' using errcode = 'P0002';
  end if;

  if version is null or version !~ '^[A-Za-z0-9._-]{1,16}$' then
    version := '1';
  end if;

  if category is not null and category not in (
    'prefer_not',
    'infrequent',
    'features',
    'premium_price',
    'other_app',
    'technical',
    'other'
  ) then
    category := null;
  end if;

  begin
    perform public.purge_account_exit_survey();
  exception
    when others then
      null;
  end;

  if category is not null then
    begin
      cleaned := case
        when category = 'other' then public.sanitize_exit_comment(note)
        else null
      end;
      insert into public.account_exit_survey (category, comment, survey_version)
      values (category, cleaned, version);
    exception
      when others then
        null;
    end;
  end if;

  if to_regclass('public.habit_completion_events') is not null then
    delete from public.habit_completion_events where user_id = uid;
  end if;
  if to_regclass('public.habit_day_logs') is not null then
    delete from public.habit_day_logs where user_id = uid;
  end if;
  if to_regclass('public.circle_events') is not null then
    delete from public.circle_events where user_id = uid;
  end if;
  if to_regclass('public.hydration_days') is not null then
    delete from public.hydration_days where user_id = uid;
  end if;
  if to_regclass('public.sleep_checkins') is not null then
    delete from public.sleep_checkins where user_id = uid;
  end if;
  if to_regclass('public.mood_checkins') is not null then
    delete from public.mood_checkins where user_id = uid;
  end if;
  if to_regclass('public.sleep_preferences') is not null then
    delete from public.sleep_preferences where user_id = uid;
  end if;
  if to_regclass('public.checkin_prompt_state') is not null then
    delete from public.checkin_prompt_state where user_id = uid;
  end if;
  if to_regclass('public.day_celebrations') is not null then
    delete from public.day_celebrations where user_id = uid;
  end if;
  if to_regclass('public.user_habits') is not null then
    delete from public.user_habits where user_id = uid;
  end if;
  if to_regclass('public.habit_routines') is not null then
    delete from public.habit_routines where user_id = uid;
  end if;
  if to_regclass('public.circle_friends') is not null then
    delete from public.circle_friends where owner_id = uid or friend_id = uid;
  end if;
  if to_regclass('public.circle_friend_requests') is not null then
    delete from public.circle_friend_requests where from_id = uid or to_id = uid;
  end if;
  if to_regclass('public.circle_memberships') is not null then
    delete from public.circle_memberships where user_id = uid;
  end if;
  if to_regclass('public.circle_results') is not null then
    delete from public.circle_results where user_id = uid;
  end if;
  if to_regclass('public.journey_days') is not null then
    delete from public.journey_days where user_id = uid;
  end if;
  if to_regclass('public.journey_state') is not null then
    delete from public.journey_state where user_id = uid;
  end if;
  if to_regclass('public.profiles') is not null then
    delete from public.profiles where user_id = uid;
  end if;

  if to_regclass('storage.objects') is not null then
    if exists (
      select 1
      from storage.objects object
      where object.bucket_id = 'avatars'
        and (
          object.name = uid::text
          or object.name like uid::text || '/%'
        )
    ) then
      raise exception 'avatar files remain' using errcode = 'P0001';
    end if;
  end if;

  for blocker in
    select ns.nspname as schema_name,
           cl.relname as table_name,
           att.attname as column_name
    from pg_catalog.pg_constraint con
    join pg_catalog.pg_class cl on cl.oid = con.conrelid
    join pg_catalog.pg_namespace ns on ns.oid = cl.relnamespace
    join pg_catalog.pg_attribute att
      on att.attrelid = cl.oid
     and att.attnum = con.conkey[1]
     and not att.attisdropped
    where con.contype = 'f'
      and con.confrelid = 'auth.users'::regclass
      and pg_catalog.cardinality(con.conkey) = 1
      and con.confdeltype <> 'c'
      and ns.nspname in ('public', 'storage')
      and cl.relkind = 'r'
  loop
    execute pg_catalog.format(
      'select count(*) from %I.%I where %I::text = $1',
      blocker.schema_name,
      blocker.table_name,
      blocker.column_name
    ) into remaining using uid::text;
    if remaining > 0 then
      raise exception 'account delete blocked' using errcode = 'P0001';
    end if;
  end loop;

  delete from auth.users where id = uid;

  if exists (select 1 from auth.users where id = uid) then
    raise exception 'account delete failed' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public.delete_own_account(text, text, text) from public, anon;
grant execute on function public.delete_own_account(text, text, text) to authenticated;

alter function public.purge_account_exit_survey() owner to postgres;
alter function public.delete_own_account(text, text, text) owner to postgres;

do $cron$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if not exists (select 1 from cron.job where jobname = 'purge-account-exit-survey') then
      perform cron.schedule(
        'purge-account-exit-survey',
        '15 6 * * *',
        'select public.purge_account_exit_survey()'
      );
    end if;
  end if;
exception
  when others then
    null;
end;
$cron$;

-- -----------------------------------------------------------------------------
-- 6) Recarregar cache do PostgREST (Supabase API)
-- -----------------------------------------------------------------------------
notify pgrst, 'reload schema';

commit;

-- =============================================================================
-- 7) VALIDAÇÃO FINAL (roda após o COMMIT; somente leitura + asserts)
--    Cada linha do resultado deve mostrar status = OK.
-- =============================================================================
with checks as (
  select 'habit_completion_events existe' as check_name,
         case when to_regclass('public.habit_completion_events') is not null then 'OK' else 'FALHA' end as status
  union all
  select 'sleep_checkins existe',
         case when to_regclass('public.sleep_checkins') is not null then 'OK' else 'FALHA' end
  union all
  select 'mood_checkins existe',
         case when to_regclass('public.mood_checkins') is not null then 'OK' else 'FALHA' end
  union all
  select 'sleep_preferences existe',
         case when to_regclass('public.sleep_preferences') is not null then 'OK' else 'FALHA' end
  union all
  select 'checkin_prompt_state existe',
         case when to_regclass('public.checkin_prompt_state') is not null then 'OK' else 'FALHA' end
  union all
  select 'coluna sleep_checkins.note',
         case when exists (
           select 1 from information_schema.columns
           where table_schema = 'public' and table_name = 'sleep_checkins' and column_name = 'note'
         ) then 'OK' else 'FALHA' end
  union all
  select 'coluna mood_checkins.note',
         case when exists (
           select 1 from information_schema.columns
           where table_schema = 'public' and table_name = 'mood_checkins' and column_name = 'note'
         ) then 'OK' else 'FALHA' end
  union all
  select 'constraint quality 0–10',
         case when exists (
           select 1 from pg_constraint
           where conname = 'sleep_checkins_quality_valid'
             and pg_get_constraintdef(oid) ilike '%0%10%'
         ) then 'OK' else 'FALHA' end
  union all
  select 'constraint level 0–10',
         case when exists (
           select 1 from pg_constraint
           where conname = 'mood_checkins_level_valid'
             and pg_get_constraintdef(oid) ilike '%0%10%'
         ) then 'OK' else 'FALHA' end
  union all
  select 'constraint mood score 0–100',
         case when exists (
           select 1 from pg_constraint
           where conname = 'mood_checkins_score_valid'
             and pg_get_constraintdef(oid) ilike '%0%100%'
         ) then 'OK' else 'FALHA' end
  union all
  select 'nenhum sleep.quality fora 0–10',
         case when not exists (
           select 1 from public.sleep_checkins where quality < 0 or quality > 10
         ) then 'OK' else 'FALHA' end
  union all
  select 'nenhum mood.level fora 0–10',
         case when not exists (
           select 1 from public.mood_checkins where level < 0 or level > 10
         ) then 'OK' else 'FALHA' end
  union all
  select 'RLS sleep_preferences',
         case when exists (
           select 1 from pg_class c
           join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relname = 'sleep_preferences' and c.relrowsecurity
         ) then 'OK' else 'FALHA' end
  union all
  select 'RLS sleep_checkins',
         case when exists (
           select 1 from pg_class c
           join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relname = 'sleep_checkins' and c.relrowsecurity
         ) then 'OK' else 'FALHA' end
  union all
  select 'RLS mood_checkins',
         case when exists (
           select 1 from pg_class c
           join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relname = 'mood_checkins' and c.relrowsecurity
         ) then 'OK' else 'FALHA' end
  union all
  select 'RLS habit_completion_events',
         case when exists (
           select 1 from pg_class c
           join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relname = 'habit_completion_events' and c.relrowsecurity
         ) then 'OK' else 'FALHA' end
  union all
  select 'anon SEM grant em sleep_checkins',
         case when not has_table_privilege('anon', 'public.sleep_checkins', 'select')
           then 'OK' else 'FALHA' end
  union all
  select 'anon SEM grant em mood_checkins',
         case when not has_table_privilege('anon', 'public.mood_checkins', 'select')
           then 'OK' else 'FALHA' end
  union all
  select 'anon SEM grant em sleep_preferences',
         case when not has_table_privilege('anon', 'public.sleep_preferences', 'select')
           then 'OK' else 'FALHA' end
  union all
  select 'delete_own_account contempla sleep_preferences',
         case when pg_get_functiondef('public.delete_own_account(text,text,text)'::regprocedure)
                ilike '%sleep_preferences%'
           then 'OK' else 'FALHA' end
  union all
  select 'delete_own_account contempla habit_completion_events',
         case when pg_get_functiondef('public.delete_own_account(text,text,text)'::regprocedure)
                ilike '%habit_completion_events%'
           then 'OK' else 'FALHA' end
  union all
  select 'marker charts-checkins-0to10-v1',
         case when exists (
           select 1 from public.utime_schema_migrations where id = 'charts-checkins-0to10-v1'
         ) then 'OK' else 'FALHA' end
  union all
  select 'Premium RPC utime_my_plan preservada',
         case when to_regprocedure('public.utime_my_plan()') is not null
           then 'OK' else 'AVISO' end
  union all
  select 'Premium lifetime emails preservada',
         case when to_regprocedure('public.utime_lifetime_emails()') is not null
           then 'OK' else 'AVISO' end
  union all
  select 'compat frontend: quality aceita 0 e 10',
         case when exists (
           select 1 from pg_constraint
           where conname = 'sleep_checkins_quality_valid'
             and pg_get_constraintdef(oid) ilike '%0%10%'
         ) then 'OK' else 'FALHA' end
  union all
  select 'compat frontend: level aceita 0 e 10',
         case when exists (
           select 1 from pg_constraint
           where conname = 'mood_checkins_level_valid'
             and pg_get_constraintdef(oid) ilike '%0%10%'
         ) then 'OK' else 'FALHA' end
)
select check_name, status
from checks
order by case when status = 'FALHA' then 0 when status = 'AVISO' then 1 else 2 end, check_name;
