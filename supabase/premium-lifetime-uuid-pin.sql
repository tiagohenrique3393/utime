-- UTime: reforço UUID-pinned do Premium vitalício (Tiago + Francine).
-- Complementa premium-plan-rpc.sql (e-mail / identity). Idempotente.
-- Não rebaixa assinantes pagos. Não altera hábitos, sono, humor, círculo.
--
-- Os UUIDs são resolvidos em auth.users pelos e-mails vitalícios na execução.
-- Se a conta ainda não existir, a função de e-mails continua cobrindo no login.

create or replace function public.utime_lifetime_user_ids()
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(distinct users.id), '{}'::uuid[])
  from auth.users users
  where lower(btrim(users.email)) = any (public.utime_lifetime_emails())
     or exists (
       select 1
       from auth.identities ident
       where ident.user_id = users.id
         and lower(btrim(ident.identity_data->>'email')) = any (public.utime_lifetime_emails())
     );
$$;

revoke all on function public.utime_lifetime_user_ids() from public, anon, authenticated;
alter function public.utime_lifetime_user_ids() owner to postgres;

create or replace function public.utime_user_has_lifetime(target uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if target is null then
    return false;
  end if;
  if target = any (public.utime_lifetime_user_ids()) then
    return true;
  end if;
  return public.utime_user_has_lifetime_email(target);
end;
$$;

revoke all on function public.utime_user_has_lifetime(uuid) from public, anon, authenticated;
alter function public.utime_user_has_lifetime(uuid) owner to postgres;

-- Reaplica protect_profile_plan para aceitar UUID pin além do e-mail.
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

  if tg_op = 'UPDATE'
     and old.plan = 'premium'
     and new.plan is distinct from 'premium'
     and public.utime_user_has_lifetime(new.user_id) then
    new.plan := 'premium';
    return new;
  end if;

  if auth.uid() is null
     or current_setting('utime.allow_plan_change', true) = 'on' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.plan := 'free';
    return new;
  end if;

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

-- Garante Premium nas contas vitalícias encontradas agora.
do $$
declare
  target uuid;
begin
  perform set_config('utime.allow_plan_change', 'on', true);
  foreach target in array public.utime_lifetime_user_ids()
  loop
    perform public.utime_ensure_lifetime_plan(target);
  end loop;
end $$;
