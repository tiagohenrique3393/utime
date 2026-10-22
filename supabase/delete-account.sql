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
-- Fotos: este script não apaga storage.objects e não remove o arquivo físico.
-- Apagar essa tabela direto não remove o arquivo do Storage.
-- O aplicativo lista a pasta do usuário no bucket avatars, remove os objetos
-- pela API oficial storage.from('avatars').remove e lista de novo.
-- A política avatars_delete_own só permite apagar objeto cujo primeiro
-- diretório é auth.uid(). A política avatars_public_read permanece, porque
-- a foto de perfil é pública. Não há política de update.
-- Se a listagem, a remoção ou a segunda listagem falhar, ou se sobrar arquivo,
-- o aplicativo não chama esta função.
-- Se ainda existir objeto em avatars com nome igual ao uid ou dentro da pasta
-- do uid, esta função interrompe com 'avatar files remain' e desfaz tudo.
--
-- Vínculos: antes de apagar auth.users, a função conta linhas em public e
-- storage cuja chave estrangeira para auth.users não é cascade. Se sobrar
-- linha, interrompe com 'account delete blocked' e desfaz tudo.
-- O schema auth não entra nessa contagem: a sessão atual apontaria para o
-- próprio usuário e bloquearia toda exclusão. Sessions, identities e refresh
-- tokens dependem do cascade interno do Supabase. Se algum desses vínculos
-- impedir o delete, a transação inteira é desfeita.
-- O arquivo delete-account-diagnose.sql é somente leitura e lista esses vínculos.
--
-- A função é security definer e o dono precisa ser postgres, o mesmo papel
-- do SQL Editor. Assim ela consegue apagar auth.users e ler storage.objects
-- acima do RLS. Ela só usa auth.uid(). Não aceita identificador de outra conta.
--
-- A pesquisa não guarda nome, e-mail, identificador, IP nem sessão.
-- Falha ao gravar ou limpar a pesquisa é ignorada de propósito.
-- Falha ao apagar tabela pessoal, foto restante, vínculo sem cascade ou
-- auth.users não é ignorada: a transação inteira é desfeita.
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
