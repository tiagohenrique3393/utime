-- Perfil público e nome de usuário.
-- Execute este arquivo uma vez no SQL Editor do Supabase, depois do Circle 2.0.
-- Não apaga perfis, hábitos, amizades nem resultados do ranking.
-- O identificador antigo, se existir, permanece. Só a pessoa troca o próprio @.

alter table public.profiles
  add column if not exists bio text;

alter table public.profiles
  drop constraint if exists profiles_bio_length;

alter table public.profiles
  add constraint profiles_bio_length
  check (bio is null or char_length(bio) <= 160);

alter table public.profiles
  drop constraint if exists profiles_public_handle_format;

alter table public.profiles
  add constraint profiles_public_handle_format
  check (
    public_handle is null
    or public_handle ~ '^[a-z0-9]([a-z0-9._-]{0,30}[a-z0-9])?$'
  ) not valid;

create or replace function public.profile_handle_status(candidate text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  normalized text := lower(regexp_replace(btrim(coalesce(candidate, '')), '^@+', ''));
begin
  if uid is null then
    raise exception 'auth required';
  end if;
  if normalized !~ '^[a-z0-9][a-z0-9._]{1,18}[a-z0-9]$' then
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
declare
  uid uuid := auth.uid();
  normalized text := lower(regexp_replace(btrim(coalesce(candidate, '')), '^@+', ''));
begin
  if uid is null then
    raise exception 'auth required';
  end if;
  if normalized !~ '^[a-z0-9][a-z0-9._]{1,18}[a-z0-9]$' then
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

create or replace function public.profile_set_bio(value text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  normalized text := btrim(coalesce(value, ''));
begin
  if uid is null then
    raise exception 'auth required';
  end if;
  if char_length(normalized) > 160 then
    raise exception 'invalid bio';
  end if;
  if not exists (
    select 1
    from public.profiles profile
    where profile.user_id = uid
  ) then
    raise exception 'profile missing';
  end if;
  update public.profiles
  set bio = nullif(normalized, '')
  where user_id = uid;
  return normalized;
end;
$$;

create or replace function public.profile_public(target uuid)
returns table (
  user_id uuid,
  display_name text,
  handle text,
  journey text,
  bio text,
  week_rank integer,
  podium_count integer,
  first_count integer,
  relation text,
  avatar_path text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  start_day date;
  finish_day date;
  rank_value integer;
  podiums integer;
  firsts integer;
  rel text;
begin
  if uid is null then
    raise exception 'auth required';
  end if;
  if target is null or not exists (
    select 1
    from public.profiles profile
    where profile.user_id = target
  ) then
    return;
  end if;

  start_day := public.circle_period_start('semana', public.circle_today());
  finish_day := public.circle_period_end('semana', start_day);
  if exists (
    select 1
    from public.circle_memberships membership
    where membership.user_id = target
      and membership.left_at is null
  ) then
    select ranked.rank_position
    into rank_value
    from (
      select
        members.user_id,
        rank() over (order by coalesce(points.score, 0) desc)::integer as rank_position
      from (
        select membership.user_id
        from public.circle_memberships membership
        where membership.left_at is null
      ) members
      left join (
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
          where event.occurred_on >= start_day
            and event.occurred_on < finish_day
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
      ) points on points.user_id = members.user_id
    ) ranked
    where ranked.user_id = target;
  end if;

  select
    count(*) filter (where result.rank_position <= 3 and result.score > 0)::integer,
    count(*) filter (where result.rank_position = 1 and result.score > 0)::integer
  into podiums, firsts
  from public.circle_results result
  where result.user_id = target;

  if target = uid then
    rel := 'self';
  elsif exists (
    select 1
    from public.circle_friends friend
    where friend.owner_id = uid
      and friend.friend_id = target
  ) and exists (
    select 1
    from public.circle_friends back
    where back.owner_id = target
      and back.friend_id = uid
  ) then
    rel := 'friend';
  elsif exists (
    select 1
    from public.circle_friend_requests request
    where request.from_id = uid
      and request.to_id = target
  ) then
    rel := 'sent';
  elsif exists (
    select 1
    from public.circle_friend_requests request
    where request.from_id = target
      and request.to_id = uid
  ) then
    rel := 'received';
  else
    rel := 'none';
  end if;

  return query
  select
    profile.user_id,
    coalesce(nullif(btrim(profile.first_name), ''), 'Sem nome') as display_name,
    coalesce(profile.public_handle, '') as handle,
    case
      when profile.journey in ('metime', 'womantime') then profile.journey
      else null
    end as journey,
    coalesce(profile.bio, '') as bio,
    rank_value as week_rank,
    coalesce(podiums, 0) as podium_count,
    coalesce(firsts, 0) as first_count,
    rel as relation,
    case
      when profile.avatar_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpeg|png)$'
       and (
         profile.user_id = uid
         or coalesce(profile.public_handle, '') <> ''
         or exists (
           select 1
           from public.circle_memberships membership
           where membership.user_id = profile.user_id
             and membership.left_at is null
         )
       )
      then profile.avatar_path
      else null
    end as avatar_path
  from public.profiles profile
  where profile.user_id = target;
end;
$$;

-- A busca continua exigindo participação no ranking dos dois lados da amizade.
-- O underline deixa de ser apagado e passa a ser procurado como caractere literal.
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
  term := lower(regexp_replace(btrim(coalesce(query, '')), '^@+', ''));
  term := replace(replace(term, '\', ''), '%', '');
  if char_length(term) < 2 then
    return;
  end if;
  term := replace(term, '_', '\_');
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
      profile.first_name ilike '%' || term || '%' escape '\'
      or profile.public_handle ilike '%' || term || '%' escape '\'
    )
  order by display_name, profile.user_id
  limit 30;
end;
$$;

revoke all on function public.profile_handle_status(text) from public, anon;
revoke all on function public.profile_set_handle(text) from public, anon;
revoke all on function public.profile_set_bio(text) from public, anon;
revoke all on function public.profile_public(uuid) from public, anon;
revoke all on function public.circle_search(text) from public, anon;

grant execute on function public.profile_handle_status(text) to authenticated;
grant execute on function public.profile_set_handle(text) to authenticated;
grant execute on function public.profile_set_bio(text) to authenticated;
grant execute on function public.profile_public(uuid) to authenticated;
grant execute on function public.circle_search(text) to authenticated;
