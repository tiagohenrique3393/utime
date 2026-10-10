-- Círculo UTime. Execute este arquivo manualmente no SQL Editor, somente depois de aprovar.
-- Ele não apaga hábitos, hidratação, constância, jornada, perfis nem o ranking antigo.
-- Não recria policies de profiles, journey_days, journey_state, habit_day_logs,
-- hydration_days, user_habits nem utime_ranking.
--
-- Os 10 hábitos sugeridos permanecem no progresso pessoal e não geram ponto.
-- A inscrição é voluntária e só é aceita com 2 hábitos de alta, 4 de média e 4 de baixa,
-- fora desses 10. Ninguém é inscrito automaticamente.
-- Cada dia vale no máximo 100 pontos essenciais e 10 de bônus, com teto de 110.
-- A relevância é copiada no momento da conclusão. Mudá-la depois não reescreve o passado.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'circle_events'
      and column_name = 'task_id'
  ) then
    raise exception 'circle_events está no formato antigo. Este script não converte essa tabela sozinho.';
  end if;
end $$;

alter table public.user_habits
  add column if not exists relevance text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_habits_relevance_valid'
      and conrelid = 'public.user_habits'::regclass
  ) then
    alter table public.user_habits
      add constraint user_habits_relevance_valid
      check (relevance is null or relevance in ('alta', 'media', 'baixa'));
  end if;
end $$;

create index if not exists user_habits_circle_relevance_idx
  on public.user_habits (user_id, relevance)
  where active = true and relevance is not null;

create table if not exists public.circle_personal_habits (
  catalog_habit_id text primary key
);

insert into public.circle_personal_habits (catalog_habit_id)
values
  ('corpo-atividade'),
  ('corpo-refeicao'),
  ('corpo-hidratacao'),
  ('corpo-higiene'),
  ('mente-estudo'),
  ('mente-leitura'),
  ('mente-prioridades'),
  ('espirito-meditacao'),
  ('espirito-atencao'),
  ('espirito-gratidao')
on conflict (catalog_habit_id) do nothing;

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
  user_habit_id uuid not null,
  occurred_on date not null,
  relevance text not null,
  recorded_at timestamptz not null default now(),
  primary key (user_id, user_habit_id, occurred_on),
  constraint circle_events_relevance_valid check (relevance in ('alta', 'media', 'baixa'))
);

create index if not exists circle_events_day_idx
  on public.circle_events (occurred_on, user_id, relevance);

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
  score numeric(12, 1) not null,
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

create table if not exists public.circle_setup (
  setup_key text primary key,
  done_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists public_handle text;

create unique index if not exists profiles_public_handle_unique
  on public.profiles (public_handle)
  where public_handle is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_public_handle_format'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_public_handle_format
      check (
        public_handle is null
        or public_handle ~ '^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])?$'
      );
  end if;
end $$;

alter table public.circle_personal_habits enable row level security;
alter table public.circle_memberships enable row level security;
alter table public.circle_events enable row level security;
alter table public.circle_friends enable row level security;
alter table public.circle_results enable row level security;
alter table public.circle_closures enable row level security;
alter table public.circle_setup enable row level security;

revoke all on table public.circle_personal_habits from public, anon;
revoke all on table public.circle_memberships from public, anon;
revoke all on table public.circle_events from public, anon;
revoke all on table public.circle_friends from public, anon;
revoke all on table public.circle_results from public, anon;
revoke all on table public.circle_closures from public, anon;
revoke all on table public.circle_setup from public, anon;

grant select, delete on table public.circle_friends to authenticated;

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

drop function if exists public.circle_record_official_habit(text);
drop function if exists public.circle_state();
drop function if exists public.circle_board(text, date, text);

create or replace function public.circle_today()
returns date
language sql
volatile
set search_path = ''
as $$
  select (timezone('America/Sao_Paulo', pg_catalog.clock_timestamp()))::date;
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

create or replace function public.circle_date_frozen(day date)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.circle_closures closure
    where (closure.period_kind, closure.period_start) in (
      ('semana', public.circle_period_start('semana', day)),
      ('mes', public.circle_period_start('mes', day)),
      ('ano', public.circle_period_start('ano', day))
    )
  );
$$;

create or replace function public.circle_day_points(alta integer, media integer, baixa integer)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select least(
    110::numeric,
    least(greatest(coalesce(alta, 0), 0), 2) * 20
    + least(greatest(coalesce(media, 0), 0), 4) * 10
    + least(greatest(coalesce(baixa, 0), 0), 4) * 5
    + least(
      10::numeric,
      (greatest(coalesce(alta, 0), 0) - least(greatest(coalesce(alta, 0), 0), 2)) * 5
      + (greatest(coalesce(media, 0), 0) - least(greatest(coalesce(media, 0), 0), 4)) * 2.5
      + (greatest(coalesce(baixa, 0), 0) - least(greatest(coalesce(baixa, 0), 0), 4)) * 1
    )
  );
$$;

create or replace function public.circle_ranking_habit(catalog_habit_id text, active boolean, relevance text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select active is true
    and relevance in ('alta', 'media', 'baixa')
    and (
      catalog_habit_id is null
      or not exists (
        select 1
        from public.circle_personal_habits personal
        where personal.catalog_habit_id = circle_ranking_habit.catalog_habit_id
      )
    );
$$;

create or replace function public.circle_habit_counts(uid uuid)
returns table (alta_count integer, media_count integer, baixa_count integer, ready boolean)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or uid is distinct from auth.uid() then
    raise exception 'auth required';
  end if;
  return query
  select
    (count(*) filter (where habit.relevance = 'alta'))::integer,
    (count(*) filter (where habit.relevance = 'media'))::integer,
    (count(*) filter (where habit.relevance = 'baixa'))::integer,
    (
      count(*) filter (where habit.relevance = 'alta') >= 2
      and count(*) filter (where habit.relevance = 'media') >= 4
      and count(*) filter (where habit.relevance = 'baixa') >= 4
    )
  from public.user_habits habit
  where habit.user_id = uid
    and public.circle_ranking_habit(habit.catalog_habit_id, habit.active, habit.relevance);
end;
$$;

create or replace function public.circle_protect_handle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if coalesce(current_setting('utime.allow_handle', true), '') <> '1' then
      new.public_handle := null;
    end if;
    return new;
  end if;
  if new.public_handle is distinct from old.public_handle
     and coalesce(current_setting('utime.allow_handle', true), '') <> '1' then
    new.public_handle := old.public_handle;
  end if;
  return new;
end;
$$;

drop trigger if exists circle_protect_handle on public.profiles;
create trigger circle_protect_handle
before insert or update on public.profiles
for each row execute function public.circle_protect_handle();

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
  if auth.uid() is null or uid is distinct from auth.uid() then
    raise exception 'auth required';
  end if;
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
  base_text := trim(both '-' from left(base_text, 24));
  if base_text = '' then
    base_text := 'participante';
  end if;
  candidate := base_text;
  if exists (
    select 1 from public.profiles
    where public_handle = candidate
      and user_id <> uid
  ) then
    candidate := trim(both '-' from left(base_text, 19)) || '-' || suffix;
    if candidate = '-' || suffix then
      candidate := 'participante-' || suffix;
    end if;
  end if;
  perform set_config('utime.allow_handle', '1', true);
  begin
    update public.profiles
    set public_handle = candidate
    where user_id = uid
      and public_handle is null;
  exception
    when unique_violation then
      candidate := trim(both '-' from left(base_text, 19)) || '-' || suffix;
      if candidate = '-' || suffix then
        candidate := 'participante-' || suffix;
      end if;
      update public.profiles
      set public_handle = candidate
      where user_id = uid
        and public_handle is null;
  end;
  return candidate;
end;
$$;

create or replace function public.circle_sync_habit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  catalog text;
  rel text;
  is_active boolean;
begin
  if tg_op = 'DELETE' then
    if not public.circle_date_frozen(old.occurred_on) then
      delete from public.circle_events event
      where event.user_id = old.user_id
        and event.occurred_on = old.occurred_on
        and event.user_habit_id = old.user_habit_id;
    end if;
    return null;
  end if;

  if tg_op = 'UPDATE' and (
    old.occurred_on is distinct from new.occurred_on
    or old.user_habit_id is distinct from new.user_habit_id
    or (old.completed = true and new.completed = false)
  ) then
    if not public.circle_date_frozen(old.occurred_on) then
      delete from public.circle_events event
      where event.user_id = old.user_id
        and event.occurred_on = old.occurred_on
        and event.user_habit_id = old.user_habit_id;
    end if;
  end if;

  if new.completed is not true then
    return null;
  end if;

  select habit.catalog_habit_id, habit.relevance, habit.active
  into catalog, rel, is_active
  from public.user_habits habit
  where habit.id = new.user_habit_id
    and habit.user_id = new.user_id;

  if not public.circle_ranking_habit(catalog, is_active, rel) then
    return null;
  end if;

  if new.occurred_on = public.circle_today()
     and (tg_op = 'INSERT' or old.occurred_on = public.circle_today()) then
    insert into public.circle_events (user_id, user_habit_id, occurred_on, relevance)
    values (new.user_id, new.user_habit_id, new.occurred_on, rel)
    on conflict (user_id, user_habit_id, occurred_on) do nothing;
  end if;

  return null;
end;
$$;

drop trigger if exists circle_sync_habit_log on public.habit_day_logs;
create trigger circle_sync_habit_log
after insert or update of completed, occurred_on, user_habit_id or delete
on public.habit_day_logs
for each row execute function public.circle_sync_habit_log();

create or replace function public.circle_state()
returns table (
  enrolled boolean,
  handle text,
  joined_at timestamptz,
  alta_count integer,
  media_count integer,
  baixa_count integer,
  ready boolean
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
    counts.ready;
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
  counts record;
begin
  if uid is null then
    raise exception 'auth required';
  end if;
  select * into counts from public.circle_habit_counts(uid);
  if counts.ready is not true then
    raise exception 'circle requirements missing';
  end if;
  if exists (
    select 1
    from public.circle_memberships membership
    where membership.user_id = uid
      and membership.left_at is null
  ) then
    perform public.circle_ensure_handle(uid);
    return;
  end if;
  insert into public.circle_memberships (user_id)
  values (uid);
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
  set left_at = pg_catalog.clock_timestamp()
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
              and (membership.left_at is null or membership.left_at > start_at)
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
      rank() over (order by visible.score desc)::integer as rank_position
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
    exists (
      select 1
      from public.circle_friends friend
      where friend.owner_id = uid
        and friend.friend_id = profile.user_id
    ) as added
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
  if not exists (
    select 1
    from public.circle_memberships membership
    where membership.user_id = uid
      and membership.left_at is null
  ) then
    raise exception 'circle enrollment required';
  end if;
  if circle_add_friend.friend_id is null or circle_add_friend.friend_id = uid then
    raise exception 'invalid friend';
  end if;
  if not exists (
    select 1
    from public.circle_memberships membership
    where membership.user_id = circle_add_friend.friend_id
      and membership.left_at is null
  ) then
    raise exception 'friend unavailable';
  end if;
  insert into public.circle_friends (owner_id, friend_id)
  values (uid, circle_add_friend.friend_id)
  on conflict on constraint circle_friends_pkey do nothing;
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

insert into public.circle_events (user_id, user_habit_id, occurred_on, relevance)
select log.user_id, log.user_habit_id, log.occurred_on, habit.relevance
from public.habit_day_logs log
join public.user_habits habit
  on habit.id = log.user_habit_id
 and habit.user_id = log.user_id
where log.completed = true
  and public.circle_ranking_habit(habit.catalog_habit_id, true, habit.relevance)
  and not exists (
    select 1
    from public.circle_setup setup
    where setup.setup_key = 'relevance-log-backfill'
  )
on conflict (user_id, user_habit_id, occurred_on) do nothing;

insert into public.circle_setup (setup_key)
values ('relevance-log-backfill')
on conflict (setup_key) do nothing;

revoke all on function public.circle_today() from public, anon;
revoke all on function public.circle_period_start(text, date) from public, anon;
revoke all on function public.circle_period_end(text, date) from public, anon;
revoke all on function public.circle_date_frozen(date) from public, anon;
revoke all on function public.circle_day_points(integer, integer, integer) from public, anon;
revoke all on function public.circle_ranking_habit(text, boolean, text) from public, anon;
revoke all on function public.circle_habit_counts(uuid) from public, anon;
revoke all on function public.circle_protect_handle() from public, anon;
revoke all on function public.circle_ensure_handle(uuid) from public, anon;
revoke all on function public.circle_sync_habit_log() from public, anon;
revoke all on function public.circle_state() from public, anon;
revoke all on function public.circle_enroll() from public, anon;
revoke all on function public.circle_leave() from public, anon;
revoke all on function public.circle_close_elapsed() from public, anon;
revoke all on function public.circle_board(text, date, text) from public, anon;
revoke all on function public.circle_search(text) from public, anon;
revoke all on function public.circle_add_friend(uuid) from public, anon;
revoke all on function public.circle_remove_friend(uuid) from public, anon;
revoke all on function public.circle_friend_faces() from public, anon;

grant execute on function public.circle_today() to authenticated;
grant execute on function public.circle_period_start(text, date) to authenticated;
grant execute on function public.circle_period_end(text, date) to authenticated;
grant execute on function public.circle_date_frozen(date) to authenticated;
grant execute on function public.circle_day_points(integer, integer, integer) to authenticated;
grant execute on function public.circle_ranking_habit(text, boolean, text) to authenticated;
grant execute on function public.circle_habit_counts(uuid) to authenticated;
grant execute on function public.circle_ensure_handle(uuid) to authenticated;
grant execute on function public.circle_state() to authenticated;
grant execute on function public.circle_enroll() to authenticated;
grant execute on function public.circle_leave() to authenticated;
grant execute on function public.circle_close_elapsed() to authenticated;
grant execute on function public.circle_board(text, date, text) to authenticated;
grant execute on function public.circle_search(text) to authenticated;
grant execute on function public.circle_add_friend(uuid) to authenticated;
grant execute on function public.circle_remove_friend(uuid) to authenticated;
grant execute on function public.circle_friend_faces() to authenticated;

do $circle_cron$
declare
  existing bigint;
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise notice 'pg_cron não está ativo. Ative a extensão e execute este arquivo de novo para agendar o fechamento das 00:00 de Brasília.';
    return;
  end if;
  for existing in
    select job.jobid
    from cron.job job
    where job.jobname in ('circle-close-brasilia', 'circle-close-brasilia-retry')
  loop
    perform cron.unschedule(existing);
  end loop;
  perform cron.schedule(
    'circle-close-brasilia',
    '0 3 * * *',
    'select public.circle_close_elapsed()'
  );
  perform cron.schedule(
    'circle-close-brasilia-retry',
    '5 3 * * *',
    'select public.circle_close_elapsed()'
  );
exception
  when others then
    raise notice 'Não foi possível agendar o pg_cron: %', sqlerrm;
end
$circle_cron$;
