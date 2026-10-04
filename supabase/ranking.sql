-- UTime Score ranking. Run this file once in the Supabase SQL Editor.
-- It does not alter profiles, journey_state, journey_days, their policies, or existing rows.
-- The function only reads those tables and returns name, score, and position.
--
-- Score, kept in step with src/lib/score.ts:
--   10 points per known habit completed
-- The same habit on the same day counts once. Unchecking removes those points.
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
      ) as habits
    from days d
  ),
  totals as (
    select
      measured.user_id,
      (sum(measured.habits) * 10)::integer as score
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
