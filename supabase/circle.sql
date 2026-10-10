-- Círculo UTime. Execute este arquivo manualmente no SQL Editor, somente depois de aprovar.
-- Ele não apaga linhas, não recria tabelas existentes e não altera as políticas de
-- profiles, journey_days, journey_state, habit_day_logs, hydration_days nem utime_ranking.
-- Os pontos antigos da jornada permanecem em journey_days.
-- Rodar de novo não duplica eventos, amizades nem resultados já encerrados.

create table if not exists public.circle_official_tasks (
  task_id text primary key
);

insert into public.circle_official_tasks (task_id)
values
  ('manha-agradecimento'),
  ('manha-banho'),
  ('manha-cafe'),
  ('manha-leitura'),
  ('manha-agua'),
  ('tarde-almoco'),
  ('tarde-atividade'),
  ('tarde-lanche'),
  ('tarde-assistir'),
  ('tarde-agua'),
  ('noite-jantar'),
  ('noite-agua'),
  ('noite-leitura'),
  ('noite-ceia'),
  ('noite-oracao')
on conflict (task_id) do nothing;

create table if not exists public.circle_access (
  user_id uuid primary key references auth.users (id) on delete cascade,
  granted_at timestamptz not null default now()
);

create table if not exists public.circle_memberships (
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (user_id, joined_at)
);

create unique index if not exists circle_memberships_one_open
  on public.circle_memberships (user_id)
  where left_at is null;

create table if not exists public.circle_events (
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id text not null references public.circle_official_tasks (task_id),
  occurred_on date not null,
  points integer not null default 10,
  recorded_at timestamptz not null default now(),
  primary key (user_id, task_id, occurred_on),
  constraint circle_events_points_valid check (points = 10)
);

create table if not exists public.circle_friends (
  owner_id uuid not null references auth.users (id) on delete cascade,
  friend_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, friend_id),
  constraint circle_friends_not_self check (owner_id <> friend_id)
);

create table if not exists public.circle_results (
  period_kind text not null,
  period_start date not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  score integer not null,
  rank_position integer not null,
  primary key (period_kind, period_start, user_id),
  constraint circle_results_kind_valid check (period_kind in ('semana', 'mes', 'ano')),
  constraint circle_results_score_valid check (score >= 0)
);

create table if not exists public.circle_closures (
  period_kind text not null,
  period_start date not null,
  closed_at timestamptz not null default now(),
  primary key (period_kind, period_start),
  constraint circle_closures_kind_valid check (period_kind in ('semana', 'mes', 'ano'))
);

alter table public.profiles
  add column if not exists public_handle text;

create unique index if not exists profiles_public_handle_unique
  on public.profiles (public_handle)
  where public_handle is not null;

alter table public.circle_access enable row level security;
alter table public.circle_official_tasks enable row level security;
alter table public.circle_memberships enable row level security;
alter table public.circle_events enable row level security;
alter table public.circle_friends enable row level security;
alter table public.circle_results enable row level security;
alter table public.circle_closures enable row level security;

revoke all on table public.circle_access from public, anon;
revoke all on table public.circle_official_tasks from public, anon;
revoke all on table public.circle_memberships from public, anon;
revoke all on table public.circle_events from public, anon;
revoke all on table public.circle_friends from public, anon;
revoke all on table public.circle_results from public, anon;
revoke all on table public.circle_closures from public, anon;

grant select on table public.circle_access to authenticated;
-- Sem insert direto: a lista de inscritos não é legível pelo cliente.
-- A inclusão passa só por circle_add_friend, que confere a inscrição aberta.
grant select, delete on table public.circle_friends to authenticated;

drop policy if exists circle_access_select_own on public.circle_access;
create policy circle_access_select_own
on public.circle_access
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists circle_friends_select_own on public.circle_friends;
create policy circle_friends_select_own
on public.circle_friends
for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists circle_friends_insert_own on public.circle_friends;

drop policy if exists circle_friends_delete_own on public.circle_friends;
create policy circle_friends_delete_own
on public.circle_friends
for delete
to authenticated
using (owner_id = auth.uid());

create or replace function public.circle_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (timezone('America/Sao_Paulo', now()))::date;
$$;

create or replace function public.circle_period_start(kind text, day date)
returns date
language sql
stable
set search_path = ''
as $$
  select case kind
    when 'semana' then day - ((extract(dow from day)::integer + 6) % 7)
    when 'mes' then date_trunc('month', day::timestamp)::date
    when 'ano' then date_trunc('year', day::timestamp)::date
    else null
  end;
$$;

create or replace function public.circle_period_end(kind text, start_day date)
returns date
language sql
stable
set search_path = ''
as $$
  select case kind
    when 'semana' then start_day + 7
    when 'mes' then (start_day + interval '1 month')::date
    when 'ano' then (start_day + interval '1 year')::date
    else null
  end;
$$;

create or replace function public.circle_ensure_handle(uid uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_handle text;
  base_text text;
  candidate text;
  suffix text := right(replace(uid::text, '-', ''), 4);
begin
  select public_handle into current_handle
  from public.profiles
  where user_id = uid;
  if current_handle is not null and current_handle <> '' then
    return current_handle;
  end if;
  select lower(translate(btrim(first_name),
    'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
    'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'))
  into base_text
  from public.profiles
  where user_id = uid;
  base_text := regexp_replace(coalesce(base_text, ''), '[^a-z0-9]+', '-', 'g');
  base_text := trim(both '-' from base_text);
  if base_text = '' then
    base_text := 'participante';
  end if;
  base_text := left(base_text, 24);
  candidate := base_text;
  if exists (select 1 from public.profiles where public_handle = candidate and user_id <> uid) then
    candidate := left(base_text, 20) || '-' || suffix;
  end if;
  update public.profiles
  set public_handle = candidate
  where user_id = uid
    and public_handle is null;
  return candidate;
end;
$$;

create or replace function public.circle_record_official_habit(task_id text)
returns date
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  civil date := public.circle_today();
begin
  if uid is null then
    raise exception 'auth required';
  end if;
  if not exists (select 1 from public.circle_official_tasks official where official.task_id = circle_record_official_habit.task_id) then
    raise exception 'unknown habit';
  end if;
  insert into public.circle_events (user_id, task_id, occurred_on, points)
  values (uid, circle_record_official_habit.task_id, civil, 10)
  on conflict (user_id, task_id, occurred_on) do nothing;
  return civil;
end;
$$;

create or replace function public.circle_state()
returns table (has_access boolean, enrolled boolean, handle text, joined_at timestamptz)
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
  select
    exists (select 1 from public.circle_access access where access.user_id = uid),
    exists (
      select 1 from public.circle_memberships membership
      where membership.user_id = uid and membership.left_at is null
    ),
    (select profile.public_handle from public.profiles profile where profile.user_id = uid),
    (
      select membership.joined_at
      from public.circle_memberships membership
      where membership.user_id = uid and membership.left_at is null
    );
end;
$$;

create or replace function public.circle_enroll()
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
  if not exists (select 1 from public.circle_access access where access.user_id = uid) then
    raise exception 'circle access required';
  end if;
  if exists (
    select 1 from public.circle_memberships membership
    where membership.user_id = uid and membership.left_at is null
  ) then
    perform public.circle_ensure_handle(uid);
    return;
  end if;
  insert into public.circle_memberships (user_id) values (uid);
  perform public.circle_ensure_handle(uid);
end;
$$;

create or replace function public.circle_leave()
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
  update public.circle_memberships
  set left_at = now()
  where user_id = uid
    and left_at is null;
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
  guard integer;
  period_finish date;
  finish_at timestamptz;
begin
  foreach kind in array array['semana', 'mes', 'ano'] loop
    current_start := public.circle_period_start(kind, today);
    select min(public.circle_period_start(kind, event.occurred_on))
    into earliest
    from public.circle_events event;
    select min(public.circle_period_start(kind, (timezone('America/Sao_Paulo', membership.joined_at))::date))
    into member_start
    from public.circle_memberships membership;
    if member_start is not null and (earliest is null or member_start < earliest) then
      earliest := member_start;
    end if;
    if earliest is null or earliest >= current_start then
      continue;
    end if;
    cursor_start := earliest;
    guard := 0;
    while cursor_start < current_start and guard < 800 loop
      if not exists (
        select 1 from public.circle_closures closure
        where closure.period_kind = kind
          and closure.period_start = cursor_start
      ) then
        period_finish := public.circle_period_end(kind, cursor_start);
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
            coalesce(points.score, 0)::integer as score,
            rank() over (order by coalesce(points.score, 0) desc, member.user_id)::integer as rank_position
          from (
            select distinct membership.user_id
            from public.circle_memberships membership
            where membership.joined_at < finish_at
              and (membership.left_at is null or membership.left_at >= finish_at)
          ) member
          left join (
            select event.user_id, (count(*) * 10)::integer as score
            from public.circle_events event
            where event.occurred_on >= cursor_start
              and event.occurred_on < period_finish
            group by event.user_id
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
  score integer,
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
    select membership.user_id, null::integer as stored_score
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
    select event.user_id, (count(*) * 10)::integer as score
    from public.circle_events event
    where requested = current_start
      and event.occurred_on >= requested
      and event.occurred_on < period_finish
    group by event.user_id
  ),
  visible as (
    select
      members.user_id,
      coalesce(members.stored_score, points.score, 0)::integer as score
    from members
    left join points on points.user_id = members.user_id
    where scope = 'todos'
      or members.user_id = uid
      or exists (
        select 1
        from public.circle_friends friend
        where friend.owner_id = uid
          and friend.friend_id = members.user_id
      )
  ),
  ranked as (
    select
      visible.user_id,
      visible.score,
      rank() over (order by visible.score desc, visible.user_id)::integer as rank_position
    from visible
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
  join public.profiles profile on profile.user_id = ranked.user_id
  left join (
    select
      result.user_id,
      count(*) filter (where result.rank_position <= 3)::integer as podium_count,
      count(*) filter (where result.rank_position = 1)::integer as first_count
    from public.circle_results result
    where result.period_kind = kind
    group by result.user_id
  ) honors on honors.user_id = ranked.user_id
  order by ranked.rank_position, display_name, ranked.user_id;
end;
$$;

create or replace function public.circle_search(query text)
returns table (
  user_id uuid,
  display_name text,
  handle text,
  added boolean
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
    exists (
      select 1 from public.circle_friends friend
      where friend.owner_id = uid
        and friend.friend_id = profile.user_id
    ) as added
  from public.profiles profile
  where profile.user_id <> uid
    and exists (
      select 1 from public.circle_memberships membership
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

create or replace function public.circle_add_friend(friend_id uuid)
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
  if circle_add_friend.friend_id is null or circle_add_friend.friend_id = uid then
    raise exception 'invalid friend';
  end if;
  if not exists (
    select 1 from public.circle_memberships membership
    where membership.user_id = circle_add_friend.friend_id
      and membership.left_at is null
  ) then
    raise exception 'friend unavailable';
  end if;
  insert into public.circle_friends (owner_id, friend_id)
  values (uid, circle_add_friend.friend_id)
  on conflict (owner_id, friend_id) do nothing;
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
  where friend.owner_id = uid
    and friend.friend_id = circle_remove_friend.friend_id;
end;
$$;

create or replace function public.circle_friend_faces()
returns table (
  user_id uuid,
  display_name text,
  handle text
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
  select
    profile.user_id,
    coalesce(nullif(btrim(profile.first_name), ''), 'Sem nome') as display_name,
    coalesce(profile.public_handle, '') as handle
  from public.circle_friends friend
  join public.profiles profile on profile.user_id = friend.friend_id
  where friend.owner_id = uid
  order by display_name, profile.user_id
  limit 12;
end;
$$;

revoke all on function public.circle_today() from public, anon;
revoke all on function public.circle_period_start(text, date) from public, anon;
revoke all on function public.circle_period_end(text, date) from public, anon;
revoke all on function public.circle_ensure_handle(uuid) from public, anon;
revoke all on function public.circle_record_official_habit(text) from public, anon;
revoke all on function public.circle_state() from public, anon;
revoke all on function public.circle_enroll() from public, anon;
revoke all on function public.circle_leave() from public, anon;
revoke all on function public.circle_close_elapsed() from public, anon;
revoke all on function public.circle_board(text, date, text) from public, anon;
revoke all on function public.circle_search(text) from public, anon;
revoke all on function public.circle_add_friend(uuid) from public, anon;
revoke all on function public.circle_remove_friend(uuid) from public, anon;
revoke all on function public.circle_friend_faces() from public, anon;

grant execute on function public.circle_record_official_habit(text) to authenticated;
grant execute on function public.circle_state() to authenticated;
grant execute on function public.circle_enroll() to authenticated;
grant execute on function public.circle_leave() to authenticated;
grant execute on function public.circle_board(text, date, text) to authenticated;
grant execute on function public.circle_search(text) to authenticated;
grant execute on function public.circle_add_friend(uuid) to authenticated;
grant execute on function public.circle_remove_friend(uuid) to authenticated;
grant execute on function public.circle_friend_faces() to authenticated;

-- Acesso de teste: não libera todas as contas.
-- insert into public.circle_access (user_id) values ('COLE_O_UUID_DA_CONTA');
