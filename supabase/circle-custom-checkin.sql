-- UTime: check-in de hábito personalizado sem relevância.
-- Execute este arquivo no SQL Editor do Supabase, uma vez.
-- Ele só substitui duas funções e recria o gatilho já existente.
-- Não apaga linhas, não altera RLS, não muda pontuação e não reescreve eventos.

create or replace function public.circle_ranking_habit(catalog_habit_id text, active boolean, relevance text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    active is true
      and relevance in ('alta', 'media', 'baixa')
      and (
        catalog_habit_id is null
        or not exists (
          select 1
          from public.circle_personal_habits personal
          where personal.catalog_habit_id = circle_ranking_habit.catalog_habit_id
        )
      ),
    false
  );
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

  if public.circle_ranking_habit(catalog, is_active, rel) is not true then
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
