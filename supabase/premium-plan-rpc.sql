-- UTime: leitura confiável do plano + Premium vitalício (Tiago e Francine).
-- Execute no SQL Editor do Supabase de produção. Pode rodar de novo.
-- Não desativa RLS. Não altera hábitos, check-ins, rankings nem contratos.
-- O aplicativo passa a preferir public.utime_my_plan(); a tabela continua
-- como fallback. Novos usuários seguem no plano free (default + trigger).

create or replace function public.utime_my_plan()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select profile.plan
      from public.profiles profile
      where profile.user_id = auth.uid()
      limit 1
    ),
    'free'
  );
$$;

revoke all on function public.utime_my_plan() from public, anon;
grant execute on function public.utime_my_plan() to authenticated;
alter function public.utime_my_plan() owner to postgres;

-- Garante privilégio de leitura do plano na própria linha (RLS já restringe).
grant select, insert, update, delete on table public.profiles to authenticated;

-- Premium vitalício só para as contas já identificadas.
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
where lower(users.email) in (
  'thsouza00793@gmail.com',
  'francinegodinhodossantos@gmail.com'
)
on conflict (user_id) do nothing;

update public.profiles profile
set plan = 'premium'
from auth.users users
where profile.user_id = users.id
  and lower(users.email) in (
    'thsouza00793@gmail.com',
    'francinegodinhodossantos@gmail.com'
  )
  and profile.plan is distinct from 'premium';

-- Confirmação: cada identidade auth dessas contas e o plano lido pela RPC.
select
  users.id,
  users.email,
  profile.plan as profile_plan,
  public.challenge_is_premium(users.id) as challenge_is_premium
from auth.users users
left join public.profiles profile on profile.user_id = users.id
where lower(users.email) in (
  'thsouza00793@gmail.com',
  'francinegodinhodossantos@gmail.com'
)
order by users.email, users.created_at;

notify pgrst, 'reload schema';
