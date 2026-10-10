-- UTime: trava o dia civil de America/Sao_Paulo nas escritas de hábitos e hidratação.
-- Execute este arquivo manualmente no SQL Editor do Supabase.
-- Ele não apaga linhas, não recria tabelas e não altera as políticas de RLS já existentes.
-- Só cria uma função e dois gatilhos. Rodar de novo substitui esses gatilhos, sem mexer nos registros.

create or replace function public.utime_current_civil_date()
returns date
language sql
stable
as $$
  select (timezone('America/Sao_Paulo', now()))::date;
$$;

create or replace function public.utime_reject_closed_day()
returns trigger
language plpgsql
as $$
declare
  civil date := public.utime_current_civil_date();
begin
  if tg_op = 'DELETE' then
    if old.occurred_on is distinct from civil then
      raise exception 'closed day';
    end if;
    return old;
  end if;
  if new.occurred_on is distinct from civil or (tg_op = 'UPDATE' and old.occurred_on is distinct from civil) then
    raise exception 'closed day';
  end if;
  return new;
end;
$$;

drop trigger if exists habit_day_logs_closed_day on public.habit_day_logs;
create trigger habit_day_logs_closed_day
before insert or update or delete on public.habit_day_logs
for each row execute function public.utime_reject_closed_day();

drop trigger if exists hydration_days_closed_day on public.hydration_days;
create trigger hydration_days_closed_day
before insert or update or delete on public.hydration_days
for each row execute function public.utime_reject_closed_day();
