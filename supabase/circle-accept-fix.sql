-- Corrige o aceite de amizade.
-- Execute uma vez no SQL Editor do Supabase, depois de circle-2.sql.
-- Não apaga perfis, pedidos, amizades, pontos nem resultados.
-- O envio já funciona. Este script só troca a função que grava o aceite.

create or replace function public.circle_accept_friend(friend_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  uid uuid := auth.uid();
  sender uuid := circle_accept_friend.friend_id;
begin
  if uid is null then
    raise exception 'auth required';
  end if;
  if sender is null or sender = uid then
    raise exception 'invalid friend';
  end if;
  if not exists (
    select 1
    from public.circle_friend_requests request
    where request.from_id = sender
      and request.to_id = uid
  ) then
    raise exception 'friend request missing';
  end if;
  -- O texto dinâmico não sofre a substituição do parâmetro friend_id.
  -- O alvo ON CONFLICT (owner_id, friend_id) virava o UUID do parâmetro
  -- e o Postgres recusava a gravação.
  execute
    'insert into public.circle_friends (owner_id, friend_id)
     values ($1, $2), ($2, $1)
     on conflict on constraint circle_friends_pkey do nothing'
  using uid, sender;
  delete from public.circle_friend_requests request
  where (request.from_id = sender and request.to_id = uid)
     or (request.from_id = uid and request.to_id = sender);
end;
$$;

revoke all on function public.circle_accept_friend(uuid) from public, anon;
grant execute on function public.circle_accept_friend(uuid) to authenticated;
