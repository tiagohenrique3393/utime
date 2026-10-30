-- Correção de amizade, busca exata e carregamento do Círculo.
-- Execute uma vez no SQL Editor do Supabase, depois de profile-public.sql.
-- Não apaga perfis, hábitos, pontos, amizades confirmadas nem resultados.
-- O @ já escolhido permanece. Nenhum identificador novo é gerado automaticamente.

create table if not exists public.circle_lookup_guard (
  user_id uuid primary key references auth.users (id) on delete cascade,
  window_start timestamptz not null default now(),
  attempts integer not null default 0
);

alter table public.circle_lookup_guard enable row level security;
revoke all on table public.circle_lookup_guard from public, anon, authenticated;

-- O índice existente continua valendo. Este reforço trata maiúsculas e minúsculas
-- como o mesmo @. Se já houver duplicata equivalente, nada é apagado.
do $$
begin
  create unique index if not exists profiles_public_handle_lower_unique
    on public.profiles (lower(public_handle))
    where public_handle is not null;
exception
  when unique_violation then
    raise notice 'Índice case-insensitive não criado: já existem @ equivalentes. Nenhum dado foi apagado.';
end $$;

create or replace function public.circle_ensure_handle(uid uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_handle text;
begin
  if auth.uid() is null or uid is distinct from auth.uid() then
    raise exception 'auth required';
  end if;
  select profile.public_handle
  into current_handle
  from public.profiles profile
  where profile.user_id = uid;
  return coalesce(current_handle, '');
end;
$$;

create or replace function public.profile_handle_status(candidate text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  uid uuid := auth.uid();
  normalized text := lower(regexp_replace(btrim(coalesce(candidate, '')), '^@+', ''));
  reserved text[] := array[
    'admin', 'administrador', 'ajuda', 'api', 'help', 'moderador', 'moderator',
    'null', 'oficial', 'official', 'root', 'sistema', 'staff', 'suporte',
    'support', 'system', 'undefined', 'utime'
  ];
begin
  if uid is null then
    raise exception 'auth required';
  end if;
  if normalized !~ '^[a-z0-9][a-z0-9._]{1,18}[a-z0-9]$' or normalized = any (reserved) then
    return 'invalid';
  end if;
  if exists (
    select 1
    from public.profiles profile
    where profile.user_id = uid
      and profile.public_handle = normalized
  ) then
    return 'current';
  end if;
  if exists (
    select 1
    from public.profiles profile
    where profile.public_handle = normalized
  ) then
    return 'taken';
  end if;
  return 'available';
end;
$$;

create or replace function public.profile_set_handle(candidate text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  uid uuid := auth.uid();
  normalized text := lower(regexp_replace(btrim(coalesce(candidate, '')), '^@+', ''));
  reserved text[] := array[
    'admin', 'administrador', 'ajuda', 'api', 'help', 'moderador', 'moderator',
    'null', 'oficial', 'official', 'root', 'sistema', 'staff', 'suporte',
    'support', 'system', 'undefined', 'utime'
  ];
begin
  if uid is null then
    raise exception 'auth required';
  end if;
  if normalized !~ '^[a-z0-9][a-z0-9._]{1,18}[a-z0-9]$' or normalized = any (reserved) then
    raise exception 'invalid handle';
  end if;
  if not exists (
    select 1
    from public.profiles profile
    where profile.user_id = uid
  ) then
    raise exception 'profile missing';
  end if;
  if exists (
    select 1
    from public.profiles profile
    where profile.public_handle = normalized
      and profile.user_id <> uid
  ) then
    raise exception 'handle taken' using errcode = '23505';
  end if;
  perform set_config('utime.allow_handle', '1', true);
  begin
    update public.profiles
    set public_handle = normalized
    where user_id = uid;
  exception
    when unique_violation then
      raise exception 'handle taken' using errcode = '23505';
  end;
  return normalized;
end;
$$;

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
  -- O texto dinâmico não sofre substituição do parâmetro friend_id.
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

create or replace function public.circle_decline_friend(friend_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  uid uuid := auth.uid();
  sender uuid := circle_decline_friend.friend_id;
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
  delete from public.circle_friend_requests request
  where request.from_id = sender
    and request.to_id = uid;
end;
$$;

create or replace function public.circle_add_friend(friend_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  uid uuid := auth.uid();
  target uuid := circle_add_friend.friend_id;
begin
  if uid is null then
    raise exception 'auth required';
  end if;
  if not exists (
    select 1
    from public.circle_memberships membership
    where membership.user_id = uid
      and membership.left_at is null
  ) then
    raise exception 'circle enrollment required';
  end if;
  if target is null or target = uid then
    raise exception 'invalid friend';
  end if;
  if not exists (
    select 1
    from public.circle_memberships membership
    where membership.user_id = target
      and membership.left_at is null
  ) then
    raise exception 'friend unavailable';
  end if;
  if exists (
    select 1 from public.circle_friends friend
    where friend.owner_id = uid and friend.friend_id = target
  ) and exists (
    select 1 from public.circle_friends friend
    where friend.owner_id = target and friend.friend_id = uid
  ) then
    return;
  end if;
  if exists (
    select 1 from public.circle_friend_requests request
    where request.from_id = target and request.to_id = uid
  ) then
    perform public.circle_accept_friend(target);
    return;
  end if;
  insert into public.circle_friend_requests as request (from_id, to_id)
  values (uid, target)
  on conflict on constraint circle_friend_requests_pkey do nothing;
end;
$$;

create or replace function public.circle_remove_friend(friend_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  uid uuid := auth.uid();
  other uuid := circle_remove_friend.friend_id;
begin
  if uid is null then
    raise exception 'auth required';
  end if;
  if other is null or other = uid then
    raise exception 'invalid friend';
  end if;
  delete from public.circle_friends friend
  where (friend.owner_id = uid and friend.friend_id = other)
     or (friend.owner_id = other and friend.friend_id = uid);
  delete from public.circle_friend_requests request
  where (request.from_id = uid and request.to_id = other)
     or (request.from_id = other and request.to_id = uid);
end;
$$;

create or replace function public.circle_search(query text)
returns table (
  user_id uuid,
  display_name text,
  handle text,
  added boolean,
  relation text
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  uid uuid := auth.uid();
  term text := btrim(coalesce(query, ''));
  handle_term text;
  found uuid;
  used integer;
begin
  if uid is null then
    raise exception 'auth required';
  end if;
  if not exists (
    select 1
    from public.circle_memberships membership
    where membership.user_id = uid
      and membership.left_at is null
  ) then
    raise exception 'circle enrollment required';
  end if;
  if term ~ '^@[a-zA-Z0-9][a-zA-Z0-9._]{1,18}[a-zA-Z0-9]$' then
    handle_term := lower(substring(term from 2));
  elsif term ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
    handle_term := null;
  else
    return;
  end if;

  insert into public.circle_lookup_guard as guard (user_id, window_start, attempts)
  values (uid, pg_catalog.now(), 1)
  on conflict (user_id) do update
  set
    window_start = case
      when guard.window_start < pg_catalog.now() - interval '10 minutes' then pg_catalog.now()
      else guard.window_start
    end,
    attempts = case
      when guard.window_start < pg_catalog.now() - interval '10 minutes' then 1
      else guard.attempts + 1
    end
  returning attempts into used;
  if used > 30 then
    raise exception 'lookup limited';
  end if;

  if handle_term is not null then
    select profile.user_id
    into found
    from public.profiles profile
    where lower(profile.public_handle) = handle_term
      and profile.user_id <> uid
    limit 1;
  else
    select account.id
    into found
    from auth.users account
    where lower(account.email) = lower(term)
      and account.id <> uid
    limit 1;
  end if;
  if found is null then
    if handle_term is not null and exists (
      select 1
      from public.profiles profile
      where profile.user_id = uid
        and lower(profile.public_handle) = handle_term
    ) then
      raise exception 'self lookup';
    end if;
    if handle_term is null and exists (
      select 1
      from auth.users account
      where account.id = uid
        and lower(account.email) = lower(term)
    ) then
      raise exception 'self lookup';
    end if;
    return;
  end if;

  return query
  select
    profile.user_id,
    coalesce(nullif(btrim(profile.first_name), ''), 'Sem nome') as display_name,
    coalesce(profile.public_handle, '') as handle,
    (
      exists (
        select 1
        from public.circle_friends friend
        where friend.owner_id = uid
          and friend.friend_id = profile.user_id
      )
      and exists (
        select 1
        from public.circle_friends back
        where back.owner_id = profile.user_id
          and back.friend_id = uid
      )
    ) as added,
    case
      when exists (
        select 1
        from public.circle_friends friend
        where friend.owner_id = uid
          and friend.friend_id = profile.user_id
      ) and exists (
        select 1
        from public.circle_friends back
        where back.owner_id = profile.user_id
          and back.friend_id = uid
      ) then 'friend'
      when exists (
        select 1
        from public.circle_friend_requests request
        where request.from_id = uid
          and request.to_id = profile.user_id
      ) then 'sent'
      when exists (
        select 1
        from public.circle_friend_requests request
        where request.from_id = profile.user_id
          and request.to_id = uid
      ) then 'received'
      else 'none'
    end as relation
  from public.profiles profile
  where profile.user_id = found;
end;
$$;

-- A tela do ranking fecha no máximo 2 períodos por abertura.
-- O agendamento continua chamando circle_close_elapsed() sem limite.
-- A fórmula de pontos não muda.

create or replace function public.circle_close_elapsed()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := public.circle_today();
  kind text;
  current_start date;
  cursor_start date;
  earliest date;
  member_start date;
  last_closed date;
  guard integer;
  period_finish date;
  start_at timestamptz;
  finish_at timestamptz;
  closed_count integer := 0;
  limit_text text := nullif(pg_catalog.current_setting('utime.close_limit', true), '');
  limit_periods integer := case when limit_text ~ '^[0-9]+$' then limit_text::integer else null end;
begin
  foreach kind in array array['semana', 'mes', 'ano'] loop
    current_start := public.circle_period_start(kind, today);
    select max(closure.period_start)
    into last_closed
    from public.circle_closures closure
    where closure.period_kind = kind
      and closure.period_start < current_start;
    if last_closed is not null then
      cursor_start := public.circle_period_end(kind, last_closed);
    else
      select min(public.circle_period_start(kind, event.occurred_on))
      into earliest
      from public.circle_events event;
      select min(public.circle_period_start(kind, (timezone('America/Sao_Paulo', membership.joined_at))::date))
      into member_start
      from public.circle_memberships membership;
      if member_start is not null and (earliest is null or member_start < earliest) then
        earliest := member_start;
      end if;
      cursor_start := earliest;
    end if;
    if cursor_start is null or cursor_start >= current_start then
      continue;
    end if;
    guard := 0;
    while cursor_start < current_start and guard < 800 loop
      if not exists (
        select 1
        from public.circle_closures closure
        where closure.period_kind = kind
          and closure.period_start = cursor_start
      ) then
        period_finish := public.circle_period_end(kind, cursor_start);
        start_at := cursor_start::timestamp at time zone 'America/Sao_Paulo';
        finish_at := period_finish::timestamp at time zone 'America/Sao_Paulo';
        insert into public.circle_results (period_kind, period_start, user_id, score, rank_position)
        select
          kind,
          cursor_start,
          ranked.user_id,
          ranked.score,
          ranked.rank_position
        from (
          select
            member.user_id,
            coalesce(points.score, 0)::numeric(12, 1) as score,
            rank() over (order by coalesce(points.score, 0) desc)::integer as rank_position
          from (
            select distinct membership.user_id
            from public.circle_memberships membership
            where membership.joined_at < finish_at
              and (membership.left_at is null or membership.left_at >= finish_at)
          ) member
          left join (
            select scored.user_id, sum(scored.day_points)::numeric(12, 1) as score
            from (
              select
                event.user_id,
                public.circle_day_points(
                  (count(*) filter (where event.relevance = 'alta'))::integer,
                  (count(*) filter (where event.relevance = 'media'))::integer,
                  (count(*) filter (where event.relevance = 'baixa'))::integer
                ) as day_points
              from public.circle_events event
              where event.occurred_on >= cursor_start
                and event.occurred_on < period_finish
                and exists (
                  select 1
                  from public.circle_memberships cycle
                  where cycle.user_id = event.user_id
                    and cycle.joined_at <= event.recorded_at
                    and (cycle.left_at is null or event.recorded_at < cycle.left_at)
                )
              group by event.user_id, event.occurred_on
            ) scored
            group by scored.user_id
          ) points on points.user_id = member.user_id
        ) ranked
        on conflict (period_kind, period_start, user_id) do nothing;
        insert into public.circle_closures (period_kind, period_start)
        values (kind, cursor_start)
        on conflict (period_kind, period_start) do nothing;
        closed_count := closed_count + 1;
        if limit_periods is not null and closed_count >= limit_periods then
          return;
        end if;
      end if;
      cursor_start := public.circle_period_end(kind, cursor_start);
      guard := guard + 1;
    end loop;
  end loop;
end;
$$;


create or replace function public.circle_board(
  period_kind text,
  period_start date default null,
  scope text default 'todos'
)
returns table (
  user_id uuid,
  display_name text,
  handle text,
  score numeric,
  rank_position integer,
  podium_count integer,
  first_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  today date := public.circle_today();
  kind text := period_kind;
  requested date := period_start;
  current_start date;
  period_finish date;
begin
  if uid is null then
    raise exception 'auth required';
  end if;
  if kind not in ('semana', 'mes', 'ano') or scope not in ('todos', 'amigos') then
    raise exception 'invalid circle query';
  end if;
  if not exists (
    select 1
    from public.circle_memberships membership
    where membership.user_id = uid
  ) then
    return;
  end if;
  current_start := public.circle_period_start(kind, today);
  if requested is null then
    requested := current_start;
  end if;
  if requested <> public.circle_period_start(kind, requested) or requested > current_start then
    raise exception 'invalid period';
  end if;
  perform set_config('utime.close_limit', '2', true);
  perform public.circle_close_elapsed();
  period_finish := public.circle_period_end(kind, requested);
  return query
  with members as (
    select membership.user_id, null::numeric as stored_score
    from public.circle_memberships membership
    where requested = current_start
      and membership.left_at is null
    union all
    select result.user_id, result.score
    from public.circle_results result
    where requested < current_start
      and result.period_kind = kind
      and result.period_start = requested
  ),
  points as (
    select scored.user_id, sum(scored.day_points)::numeric as score
    from (
      select
        event.user_id,
        public.circle_day_points(
          (count(*) filter (where event.relevance = 'alta'))::integer,
          (count(*) filter (where event.relevance = 'media'))::integer,
          (count(*) filter (where event.relevance = 'baixa'))::integer
        ) as day_points
      from public.circle_events event
      where requested = current_start
        and event.occurred_on >= requested
        and event.occurred_on < period_finish
        and exists (
          select 1
          from public.circle_memberships cycle
          where cycle.user_id = event.user_id
            and cycle.joined_at <= event.recorded_at
            and (cycle.left_at is null or event.recorded_at < cycle.left_at)
        )
      group by event.user_id, event.occurred_on
    ) scored
    group by scored.user_id
  ),
  visible as (
    select
      members.user_id,
      coalesce(members.stored_score, points.score, 0)::numeric as score
    from members
    left join points on points.user_id = members.user_id
    where scope = 'todos'
      or members.user_id = uid
      or (
        exists (
          select 1
          from public.circle_friends friend
          where friend.owner_id = uid
            and friend.friend_id = members.user_id
        )
        and exists (
          select 1
          from public.circle_friends back
          where back.owner_id = members.user_id
            and back.friend_id = uid
        )
      )
  ),
  ranked as (
    select
      visible.user_id,
      visible.score,
      rank() over (order by visible.score desc)::integer as rank_position
    from visible
  ),
  kept as (
    select ranked.user_id
    from ranked
    where ranked.user_id = uid
       or ranked.user_id in (
         select top.user_id
         from ranked top
         order by top.rank_position, top.user_id
         limit 200
       )
  )
  select
    ranked.user_id,
    coalesce(nullif(btrim(profile.first_name), ''), 'Sem nome') as display_name,
    coalesce(profile.public_handle, '') as handle,
    ranked.score,
    ranked.rank_position,
    coalesce(honors.podium_count, 0)::integer as podium_count,
    coalesce(honors.first_count, 0)::integer as first_count
  from ranked
  join kept on kept.user_id = ranked.user_id
  left join public.profiles profile on profile.user_id = ranked.user_id
  left join (
    select
      result.user_id,
      count(*) filter (where result.rank_position <= 3 and result.score > 0)::integer as podium_count,
      count(*) filter (where result.rank_position = 1 and result.score > 0)::integer as first_count
    from public.circle_results result
    where result.period_kind = kind
    group by result.user_id
  ) honors on honors.user_id = ranked.user_id
  order by ranked.rank_position, display_name, ranked.user_id;
end;
$$;

revoke all on function public.circle_ensure_handle(uuid) from public, anon;
revoke all on function public.profile_handle_status(text) from public, anon;
revoke all on function public.profile_set_handle(text) from public, anon;
revoke all on function public.circle_accept_friend(uuid) from public, anon;
revoke all on function public.circle_decline_friend(uuid) from public, anon;
revoke all on function public.circle_add_friend(uuid) from public, anon;
revoke all on function public.circle_remove_friend(uuid) from public, anon;
revoke all on function public.circle_search(text) from public, anon;
revoke all on function public.circle_close_elapsed() from public, anon;
revoke all on function public.circle_board(text, date, text) from public, anon;

grant execute on function public.circle_ensure_handle(uuid) to authenticated;
grant execute on function public.profile_handle_status(text) to authenticated;
grant execute on function public.profile_set_handle(text) to authenticated;
grant execute on function public.circle_accept_friend(uuid) to authenticated;
grant execute on function public.circle_decline_friend(uuid) to authenticated;
grant execute on function public.circle_add_friend(uuid) to authenticated;
grant execute on function public.circle_remove_friend(uuid) to authenticated;
grant execute on function public.circle_search(text) to authenticated;
grant execute on function public.circle_close_elapsed() to authenticated;
grant execute on function public.circle_board(text, date, text) to authenticated;
