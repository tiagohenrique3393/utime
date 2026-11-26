-- UTime: Premium vitalício (Tiago e Francine) + leitura confiável do plano.
-- Execute no SQL Editor do Supabase de produção. Pode rodar de novo.
-- Não desativa RLS. Não altera hábitos, check-ins, rankings nem contratos.
--
-- Causa tratada: a conta autenticada no app pode ser outro user_id do que o
-- perfil marcado no SQL (e-mail duplicado / identidade Google vs senha).
-- utime_my_plan() e challenge_is_premium() reconhecem o e-mail da sessão e
-- repararam o plano desse user_id. Novos usuários sem esses e-mails seguem free.
--
-- RevenueCat futuro: webhooks NÃO podem rebaixar contas vitalícias para free.
-- Assinatura comercial e autorização vitalícia são caminhos distintos.

create or replace function public.utime_lifetime_emails()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array[
    'thsouza00793@gmail.com',
    'francinegodinhodossantos@gmail.com'
  ]::text[];
$$;

revoke all on function public.utime_lifetime_emails() from public, anon, authenticated;
alter function public.utime_lifetime_emails() owner to postgres;

create or replace function public.utime_user_has_lifetime_email(target uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  mail text;
  identity_mail text;
  allowed text[] := public.utime_lifetime_emails();
begin
  if target is null then
    return false;
  end if;

  select lower(btrim(users.email)) into mail
  from auth.users users
  where users.id = target;

  if mail is not null and mail = any (allowed) then
    return true;
  end if;

  select lower(btrim(ident.identity_data->>'email')) into identity_mail
  from auth.identities ident
  where ident.user_id = target
    and nullif(btrim(ident.identity_data->>'email'), '') is not null
  order by ident.updated_at desc nulls last
  limit 1;

  return identity_mail is not null and identity_mail = any (allowed);
end;
$$;

revoke all on function public.utime_user_has_lifetime_email(uuid) from public, anon, authenticated;
alter function public.utime_user_has_lifetime_email(uuid) owner to postgres;

create or replace function public.protect_profile_plan()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.plan is null or new.plan not in ('free', 'premium') then
    new.plan := 'free';
  end if;

  -- Contas vitalícias nunca perdem Premium (cliente, webhook ou SQL sem GUC).
  if tg_op = 'UPDATE'
     and old.plan = 'premium'
     and new.plan is distinct from 'premium'
     and public.utime_user_has_lifetime_email(new.user_id) then
    new.plan := 'premium';
    return new;
  end if;

  -- Caminho confiável (SQL Editor / RPC vitalícia com GUC local / webhook servidor).
  if auth.uid() is null
     or current_setting('utime.allow_plan_change', true) = 'on' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.plan := 'free';
    return new;
  end if;

  -- Contas autenticadas não mudam o próprio plano pelo cliente.
  new.plan := old.plan;
  return new;
end;
$$;

drop trigger if exists profiles_protect_plan on public.profiles;
create trigger profiles_protect_plan
before insert or update on public.profiles
for each row execute function public.protect_profile_plan();

revoke all on function public.protect_profile_plan() from public, anon;
grant execute on function public.protect_profile_plan() to authenticated;
alter function public.protect_profile_plan() owner to postgres;

create or replace function public.utime_ensure_lifetime_plan(target uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_plan text;
begin
  if target is null then
    return 'free';
  end if;

  select profile.plan into current_plan
  from public.profiles profile
  where profile.user_id = target
  limit 1;

  if not public.utime_user_has_lifetime_email(target) then
    return coalesce(current_plan, 'free');
  end if;

  perform set_config('utime.allow_plan_change', 'on', true);

  insert into public.profiles (user_id, first_name, plan)
  select
    users.id,
    coalesce(
      nullif(btrim(users.raw_user_meta_data->>'first_name'), ''),
      nullif(btrim(users.raw_user_meta_data->>'name'), ''),
      ''
    ),
    'premium'
  from auth.users users
  where users.id = target
  on conflict (user_id) do update
    set plan = excluded.plan
  where public.profiles.plan is distinct from excluded.plan;

  update public.profiles
  set plan = 'premium'
  where user_id = target
    and plan is distinct from 'premium';

  return 'premium';
end;
$$;

revoke all on function public.utime_ensure_lifetime_plan(uuid) from public, anon, authenticated;
alter function public.utime_ensure_lifetime_plan(uuid) owner to postgres;

create or replace function public.utime_my_plan()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null then
    return 'free';
  end if;
  -- Volatile de propósito: pode reparar profiles.plan na identidade atual.
  return public.utime_ensure_lifetime_plan(actor);
end;
$$;

revoke all on function public.utime_my_plan() from public, anon;
grant execute on function public.utime_my_plan() to authenticated;
alter function public.utime_my_plan() owner to postgres;

-- Desafios / gates de servidor: também reparam vitalício antes de decidir.
create or replace function public.challenge_is_premium(uid uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if uid is null then
    return false;
  end if;
  return public.utime_ensure_lifetime_plan(uid) = 'premium';
end;
$$;

revoke all on function public.challenge_is_premium(uuid) from public, anon, authenticated;
alter function public.challenge_is_premium(uuid) owner to postgres;

grant select, insert, update, delete on table public.profiles to authenticated;

-- Repara agora todas as identidades ligadas aos e-mails vitalícios
-- (auth.users.email e auth.identities), não só a linha "óbvia".
with lifetime as (
  select distinct users.id as user_id
  from auth.users users
  where lower(btrim(users.email)) = any (public.utime_lifetime_emails())
  union
  select distinct ident.user_id
  from auth.identities ident
  where lower(btrim(ident.identity_data->>'email')) = any (public.utime_lifetime_emails())
)
select public.utime_ensure_lifetime_plan(lifetime.user_id)
from lifetime;

-- Confirmação: cada user_id coberto e o plano efetivo.
select
  users.id,
  users.email,
  profile.plan as profile_plan,
  public.challenge_is_premium(users.id) as challenge_is_premium,
  public.utime_ensure_lifetime_plan(users.id) as ensured_plan
from auth.users users
left join public.profiles profile on profile.user_id = users.id
where users.id in (
  select users2.id
  from auth.users users2
  where lower(btrim(users2.email)) = any (public.utime_lifetime_emails())
  union
  select ident.user_id
  from auth.identities ident
  where lower(btrim(ident.identity_data->>'email')) = any (public.utime_lifetime_emails())
)
order by users.email, users.created_at;

notify pgrst, 'reload schema';
