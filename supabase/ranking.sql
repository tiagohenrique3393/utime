-- UTime Score ranking. Run this file once in the Supabase SQL Editor.
-- It does not alter profiles, journey_state, journey_days, their policies, or existing rows.
-- The function only reads those tables and returns name, score, and position.
--
-- Score weights, kept in step with src/lib/score.ts:
--   10 points per known habit completed
--   25 points per period (Manhã, Tarde, Noite) fully completed
--   20 points per day with at least one habit
--   30 points per day in the longest consecutive run of active days
-- This is not the personal progress percentage.

create or replace function public.utime_ranking()
returns table (
  user_id uuid,
  display_name text,
  score integer,
  rank_position integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with known(id) as (
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
  ),
  manha(id) as (
    values
      ('manha-agradecimento'),
      ('manha-banho'),
      ('manha-cafe'),
      ('manha-leitura'),
      ('manha-agua')
  ),
  tarde(id) as (
    values
      ('tarde-almoco'),
      ('tarde-atividade'),
      ('tarde-lanche'),
      ('tarde-assistir'),
      ('tarde-agua')
  ),
  noite(id) as (
    values
      ('noite-jantar'),
      ('noite-agua'),
      ('noite-leitura'),
      ('noite-ceia'),
      ('noite-oracao')
  ),
  people as (
    select
      p.user_id,
      coalesce(nullif(btrim(p.first_name), ''), 'Sem nome') as display_name
    from public.profiles p
  ),
  days as (
    select
      people.user_id,
      gs.day_number,
      coalesce(j.completed_task_ids, '{}'::text[]) as ids
    from people
    cross join generate_series(1, 30) as gs(day_number)
    left join public.journey_days j
      on j.user_id = people.user_id
      and j.day_number = gs.day_number
  ),
  measured as (
    select
      d.user_id,
      d.day_number,
      (
        select count(distinct task_id)::integer
        from unnest(d.ids) as task_id
        where task_id in (select known.id from known)
      ) as habits,
      (
        case
          when (select count(distinct manha.id) from manha where manha.id = any (d.ids)) = 5 then 1
          else 0
        end
        + case
          when (select count(distinct tarde.id) from tarde where tarde.id = any (d.ids)) = 5 then 1
          else 0
        end
        + case
          when (select count(distinct noite.id) from noite where noite.id = any (d.ids)) = 5 then 1
          else 0
        end
      ) as periods
    from days d
  ),
  islands as (
    select
      measured.user_id,
      measured.day_number,
      measured.habits,
      measured.periods,
      measured.day_number - row_number() over (
        partition by measured.user_id, (measured.habits > 0)
        order by measured.day_number
      ) as grp
    from measured
  ),
  streaks as (
    select islands.user_id, count(*)::integer as length
    from islands
    where islands.habits > 0
    group by islands.user_id, islands.grp
  ),
  totals as (
    select
      measured.user_id,
      (
        sum(measured.habits) * 10
        + sum(measured.periods) * 25
        + count(*) filter (where measured.habits > 0) * 20
        + coalesce((
          select max(streaks.length)
          from streaks
          where streaks.user_id = measured.user_id
        ), 0) * 30
      )::integer as score
    from measured
    group by measured.user_id
  )
  select
    people.user_id,
    people.display_name,
    coalesce(totals.score, 0)::integer as score,
    rank() over (
      order by coalesce(totals.score, 0) desc
    )::integer as rank_position
  from people
  left join totals on totals.user_id = people.user_id
  order by rank_position, people.display_name asc, people.user_id asc;
$$;

revoke all on function public.utime_ranking() from public;
revoke all on function public.utime_ranking() from anon;
grant execute on function public.utime_ranking() to authenticated;
