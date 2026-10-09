-- UTime: conclusões diárias da rotina personalizada.
-- Execute este arquivo manualmente no SQL Editor do Supabase, depois de supabase/habits.sql.
-- Ele cria somente public.habit_day_logs. Não altera profiles, journey_days, journey_state,
-- habit_catalog, habit_routines, user_habits, o ranking nem os registros já gravados.

create table if not exists public.habit_day_logs (
  user_id uuid not null references auth.users (id) on delete cascade,
  user_habit_id uuid not null references public.user_habits (id) on delete cascade,
  occurred_on date not null,
  completed boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, user_habit_id, occurred_on)
);

drop trigger if exists habit_day_logs_set_updated_at on public.habit_day_logs;
create trigger habit_day_logs_set_updated_at
before update on public.habit_day_logs
for each row execute function public.set_updated_at();

alter table public.habit_day_logs enable row level security;

revoke all on table public.habit_day_logs from public, anon;
grant select, insert, update, delete on table public.habit_day_logs to authenticated;

drop policy if exists habit_day_logs_select_own on public.habit_day_logs;
create policy habit_day_logs_select_own
on public.habit_day_logs
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists habit_day_logs_insert_own on public.habit_day_logs;
create policy habit_day_logs_insert_own
on public.habit_day_logs
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.user_habits
    where user_habits.id = user_habit_id
      and user_habits.user_id = auth.uid()
  )
);

drop policy if exists habit_day_logs_update_own on public.habit_day_logs;
create policy habit_day_logs_update_own
on public.habit_day_logs
for update
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.user_habits
    where user_habits.id = user_habit_id
      and user_habits.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.user_habits
    where user_habits.id = user_habit_id
      and user_habits.user_id = auth.uid()
  )
);

drop policy if exists habit_day_logs_delete_own on public.habit_day_logs;
create policy habit_day_logs_delete_own
on public.habit_day_logs
for delete
to authenticated
using (auth.uid() = user_id);
