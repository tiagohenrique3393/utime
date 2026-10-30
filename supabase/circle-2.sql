-- UTime Circle 2.0. Execute este arquivo uma vez no SQL Editor do Supabase.
-- Não execute supabase/circle.sql de novo: aquele arquivo também refaz a carga inicial.
-- Este script não apaga hábitos, conclusões, hidratação, constância, perfis nem conquistas já gravadas.
-- Não desliga RLS e não recria o gatilho de check-in.
-- Amizade antiga de um lado só vira solicitação. Amizade dos dois lados permanece.
-- A exclusão da conta remove os pedidos pela chave estrangeira. O arquivo delete-account.sql
-- também apaga essas linhas no corpo da função, se for executado outra vez.
-- Os agendamentos circle-close-brasilia continuam chamando circle_close_elapsed.

create table if not exists public.circle_friend_requests (
  from_id uuid not null references auth.users (id) on delete cascade,
  to_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (from_id, to_id),
  constraint circle_friend_requests_not_self check (from_id <> to_id)
);

create index if not exists circle_friend_requests_to_idx
  on public.circle_friend_requests (to_id, from_id);

create index if not exists circle_results_owner_idx
  on public.circle_results (user_id, period_kind, period_start desc);

alter table public.circle_friend_requests enable row level security;

revoke all on table public.circle_friend_requests from public, anon;
grant select on table public.circle_friend_requests to authenticated;

drop policy if exists circle_friend_requests_select_own on public.circle_friend_requests;
create policy circle_friend_requests_select_own
on public.circle_friend_requests
for select
to authenticated
using (from_id = auth.uid() or to_id = auth.uid());

insert into public.circle_friend_requests (from_id, to_id, created_at)
select friend.owner_id, friend.friend_id, friend.created_at
from public.circle_friends friend
where not exists (
  select 1
  from public.circle_friends back
  where back.owner_id = friend.friend_id
    and back.friend_id = friend.owner_id
)
on conflict (from_id, to_id) do nothing;

delete from public.circle_friends friend
where not exists (
  select 1
  from public.circle_friends back
  where back.owner_id = friend.friend_id
    and back.friend_id = friend.owner_id
);

drop function if exists public.circle_state();

create or replace function public.circle_state()
returns table (
  enrolled boolean,
  handle text,
  joined_at timestamptz,
  alta_count integer,
  media_count integer,
  baixa_count integer,
  ready boolean,
  returning boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  counts record;
begin
  if uid is null then
    raise exception 'auth required';
  end if;
  select * into counts from public.circle_habit_counts(uid);
  return query
  select
    exists (
      select 1
      from public.circle_memberships membership
      where membership.user_id = uid
        and membership.left_at is null
    ),
    (select profile.public_handle from public.profiles profile where profile.user_id = uid),
    (
      select membership.joined_at
      from public.circle_memberships membership
      where membership.user_id = uid
        and membership.left_at is null
    ),
    counts.alta_count,
    counts.media_count,
    counts.baixa_count,
    counts.ready,
    exists (
      select 1
      from public.circle_memberships past
      where past.user_id = uid
        and past.left_at is not null
    );
end;
$$;

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

drop function if exists public.circle_search(text);
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
declare
  uid uuid := auth.uid();
  term text;
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
  term := btrim(coalesce(query, ''));
  term := regexp_replace(term, '^@+', '');
  if char_length(term) < 2 then
    return;
  end if;
  term := replace(replace(replace(term, '\', ''), '%', ''), '_', '');
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
  where profile.user_id <> uid
    and exists (
      select 1
      from public.circle_memberships membership
      where membership.user_id = profile.user_id
        and membership.left_at is null
    )
    and (
      profile.first_name ilike '%' || term || '%'
      or profile.public_handle ilike '%' || term || '%'
    )
  order by display_name, profile.user_id
  limit 30;
end;
$$;

create or replace function public.circle_accept_friend(friend_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
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
  insert into public.circle_friends (owner_id, friend_id)
  values (uid, sender), (sender, uid)
  on conflict (owner_id, friend_id) do nothing;
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
  insert into public.circle_friend_requests (from_id, to_id)
  values (uid, target)
  on conflict (from_id, to_id) do nothing;
end;
$$;

create or replace function public.circle_remove_friend(friend_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'auth required';
  end if;
  delete from public.circle_friends friend
  where (friend.owner_id = uid and friend.friend_id = circle_remove_friend.friend_id)
     or (friend.owner_id = circle_remove_friend.friend_id and friend.friend_id = uid);
  delete from public.circle_friend_requests request
  where (request.from_id = uid and request.to_id = circle_remove_friend.friend_id)
     or (request.from_id = circle_remove_friend.friend_id and request.to_id = uid);
end;
$$;

drop function if exists public.circle_friend_faces();
create or replace function public.circle_friend_faces()
returns table (
  user_id uuid,
  display_name text,
  handle text,
  relation text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'auth required';
  end if;
  return query
  with relations as (
    select friend.friend_id as person_id, 'friend'::text as relation, 2 as sort_order
    from public.circle_friends friend
    where friend.owner_id = uid
      and exists (
        select 1
        from public.circle_friends back
        where back.owner_id = friend.friend_id
          and back.friend_id = uid
      )
    union all
    select request.to_id, 'sent'::text, 1
    from public.circle_friend_requests request
    where request.from_id = uid
    union all
    select request.from_id, 'received'::text, 0
    from public.circle_friend_requests request
    where request.to_id = uid
  )
  select
    profile.user_id,
    coalesce(nullif(btrim(profile.first_name), ''), 'Sem nome') as display_name,
    coalesce(profile.public_handle, '') as handle,
    relations.relation
  from relations
  join public.profiles profile on profile.user_id = relations.person_id
  order by relations.sort_order, coalesce(nullif(btrim(profile.first_name), ''), 'Sem nome'), profile.user_id
  limit 80;
end;
$$;

create or replace function public.circle_history(kind text)
returns table (
  period_kind text,
  period_start date,
  score numeric,
  rank_position integer,
  closed_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'auth required';
  end if;
  if kind not in ('semana', 'mes', 'ano') then
    raise exception 'invalid circle query';
  end if;
  return query
  select
    result.period_kind,
    result.period_start,
    result.score,
    result.rank_position,
    closure.closed_at
  from public.circle_results result
  join public.circle_closures closure
    on closure.period_kind = result.period_kind
   and closure.period_start = result.period_start
  where result.user_id = uid
    and result.period_kind = kind
  order by result.period_start desc;
end;
$$;

revoke all on function public.circle_state() from public, anon;
revoke all on function public.circle_close_elapsed() from public, anon;
revoke all on function public.circle_board(text, date, text) from public, anon;
revoke all on function public.circle_search(text) from public, anon;
revoke all on function public.circle_accept_friend(uuid) from public, anon;
revoke all on function public.circle_decline_friend(uuid) from public, anon;
revoke all on function public.circle_add_friend(uuid) from public, anon;
revoke all on function public.circle_remove_friend(uuid) from public, anon;
revoke all on function public.circle_friend_faces() from public, anon;
revoke all on function public.circle_history(text) from public, anon;

grant execute on function public.circle_state() to authenticated;
grant execute on function public.circle_close_elapsed() to authenticated;
grant execute on function public.circle_board(text, date, text) to authenticated;
grant execute on function public.circle_search(text) to authenticated;
grant execute on function public.circle_accept_friend(uuid) to authenticated;
grant execute on function public.circle_decline_friend(uuid) to authenticated;
grant execute on function public.circle_add_friend(uuid) to authenticated;
grant execute on function public.circle_remove_friend(uuid) to authenticated;
grant execute on function public.circle_friend_faces() to authenticated;
grant execute on function public.circle_history(text) to authenticated;
