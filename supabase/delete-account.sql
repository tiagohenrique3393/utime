-- UTime: exclusão definitiva da própria conta.
-- Execute este arquivo uma vez no SQL Editor do Supabase.
-- Não execute este script contra uma conta real só para testar.
--
-- A função só enxerga auth.uid(). Não recebe identificador de conta.
-- Cada delete abaixo usa esse mesmo uid.
--
-- Tabelas pessoais verificadas no projeto e na API, e apagadas só para esse uid:
-- profiles, journey_state, journey_days, habit_routines, user_habits,
-- habit_day_logs, hydration_days, day_celebrations, circle_memberships,
-- circle_events, circle_friends (owner_id e friend_id) e circle_results.
--
-- Tabelas globais verificadas e preservadas:
-- habit_catalog, circle_personal_habits, circle_closures e circle_setup.
-- O ranking público é uma função de leitura. Não há tabela pessoal de ranking
-- além de circle_results, profiles e journey_days.
--
-- Não há tabela de assinatura Apple, Google ou Stripe.
-- Esta função não cancela cobrança nenhuma.
--
-- Fotos: este script não apaga storage.objects.
-- Apagar essa tabela direto não remove o arquivo físico do Storage.
-- O aplicativo lista e remove os arquivos do bucket avatars pela API de Storage,
-- com a sessão do próprio usuário e a política avatars_delete_own, antes de
-- chamar esta função. Sem esse passo, os arquivos podem permanecer no bucket.
--
-- Sessões: a remoção de auth.users depende dos vínculos internos do Supabase Auth
-- para sessions, refresh tokens e identities. Este ambiente não conseguiu ler
-- o schema auth. Se algum vínculo impedir a exclusão, a transação inteira é desfeita.
--
-- A pesquisa não guarda nome, e-mail, identificador, IP nem sessão.
-- Falha na pesquisa não impede a exclusão. Falha na exclusão desfaz a pesquisa.
-- Comentários livres são reduzidos, apagados em 90 dias, e o registro some em 24 meses.

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
begin
  if uid is null or issued is null or to_timestamp(issued) < pg_catalog.now() - interval '10 minutes' then
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

  if to_regclass('public.habit_day_logs') is not null then
    delete from public.habit_day_logs where user_id = uid;
  end if;
  if to_regclass('public.circle_events') is not null then
    delete from public.circle_events where user_id = uid;
  end if;
  if to_regclass('public.hydration_days') is not null then
    delete from public.hydration_days where user_id = uid;
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

  delete from auth.users where id = uid;

  if exists (select 1 from auth.users where id = uid) then
    raise exception 'account delete failed' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public.delete_own_account(text, text, text) from public, anon;
grant execute on function public.delete_own_account(text, text, text) to authenticated;

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
