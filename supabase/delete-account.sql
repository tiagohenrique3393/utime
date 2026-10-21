-- UTime: exclusão definitiva da própria conta.
-- Execute este arquivo uma vez no SQL Editor do Supabase.
-- Não apaga o catálogo de hábitos, o ranking global, os fechamentos do Círculo
-- nem qualquer linha de outra pessoa.
-- A função só enxerga auth.uid(). Não recebe identificador de conta.
-- A pesquisa não guarda nome, e-mail, identificador, IP nem sessão.
-- Falha na pesquisa não impede a exclusão. Falha na exclusão desfaz a pesquisa.
-- Não há tabela de assinatura Apple, Google ou Stripe neste projeto.
-- Esta função não cancela cobrança nenhuma e não promete cancelamento.

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
  personal record;
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

  for personal in
    select ns.nspname as schema_name, cl.relname as table_name, att.attname as column_name
    from pg_constraint con
    join pg_class cl on cl.oid = con.conrelid
    join pg_namespace ns on ns.oid = cl.relnamespace
    join pg_attribute att on att.attrelid = cl.oid and att.attnum = con.conkey[1]
    where con.contype = 'f'
      and con.confrelid = 'auth.users'::regclass
      and ns.nspname = 'public'
      and cl.relkind = 'r'
      and cl.relname <> 'account_exit_survey'
      and cardinality(con.conkey) = 1
    order by (
      select count(*)
      from pg_constraint inbound
      where inbound.confrelid = cl.oid
        and inbound.contype = 'f'
    ) asc
  loop
    execute format(
      'delete from %I.%I where %I = $1',
      personal.schema_name,
      personal.table_name,
      personal.column_name
    )
    using uid;
  end loop;

  if to_regclass('storage.objects') is not null then
    delete from storage.objects
    where bucket_id = 'avatars'
      and (
        name = uid::text
        or name like uid::text || '/%'
      );

    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'storage'
        and table_name = 'objects'
        and column_name = 'owner'
    ) then
      execute 'delete from storage.objects where owner = $1' using uid;
    end if;

    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'storage'
        and table_name = 'objects'
        and column_name = 'owner_id'
    ) then
      execute 'delete from storage.objects where owner_id = $1' using uid::text;
    end if;
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
