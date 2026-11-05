-- Mantém Premium, sem prazo, para as duas contas já identificadas.
-- Execute no SQL Editor depois de confirmar. Pode ser executado de novo.
-- Resolve o ID em auth.users. Não grava estes e-mails no aplicativo.
-- Não altera outras contas, hábitos, check-ins, rankings, contratos nem RLS.
-- Não cria agregados de progresso e não restringe os registros diários.
-- Semana, mês e ano do Progresso são calculados no aplicativo a partir desses registros.
-- Constância, Meu Dia e o progresso do dia precisam continuar lendo o próprio histórico.
-- Circle, ranking e Desafios continuam nas funções já protegidas por profiles.plan.
-- Este script não substitui challenge_sign e não foi executado pelo agente.

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

select users.id, users.email, profile.plan
from auth.users users
left join public.profiles profile on profile.user_id = users.id
where lower(users.email) in (
  'thsouza00793@gmail.com',
  'francinegodinhodossantos@gmail.com'
)
order by users.email;
