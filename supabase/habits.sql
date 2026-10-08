-- UTime: rotina personalizada de hábitos.
-- Execute este arquivo manualmente no SQL Editor do Supabase, depois de supabase/schema.sql.
-- Ele não altera profiles, journey_state, journey_days, utime_ranking nem os registros já gravados.
-- Sem uma linha em habit_routines, o aplicativo continua com os 15 hábitos oficiais.
-- Com habit_routines.personalized = true, vale somente user_habits, mesmo que não haja nenhuma linha.

create table if not exists public.habit_catalog (
  id text primary key,
  period text not null,
  pillar text not null,
  label text not null,
  sort_order integer not null,
  constraint habit_catalog_period_valid check (period in ('manha', 'tarde', 'noite')),
  constraint habit_catalog_pillar_valid check (pillar in ('corpo', 'mente', 'espirito')),
  constraint habit_catalog_label_valid check (length(btrim(label)) > 0),
  constraint habit_catalog_sort_valid check (sort_order > 0)
);

insert into public.habit_catalog (id, period, pillar, label, sort_order)
values
  ('manha-agradecimento', 'manha', 'espirito', 'Agradecimento e organização', 1),
  ('manha-banho', 'manha', 'corpo', 'Tomar um banho', 2),
  ('manha-cafe', 'manha', 'corpo', 'Tomar um café', 3),
  ('manha-leitura', 'manha', 'mente', 'Leitura e reflexão', 4),
  ('manha-agua', 'manha', 'corpo', 'Beber 1 L de água', 5),
  ('tarde-almoco', 'tarde', 'corpo', 'Almoçar', 6),
  ('tarde-atividade', 'tarde', 'corpo', 'Realizar atividade física', 7),
  ('tarde-lanche', 'tarde', 'corpo', 'Lanche da tarde', 8),
  ('tarde-assistir', 'tarde', 'mente', 'Assistir algo produtivo', 9),
  ('tarde-agua', 'tarde', 'corpo', 'Beber 1 L de água', 10),
  ('noite-jantar', 'noite', 'corpo', 'Jantar', 11),
  ('noite-agua', 'noite', 'corpo', 'Beber 1 L de água', 12),
  ('noite-leitura', 'noite', 'mente', 'Leitura e reflexão', 13),
  ('noite-ceia', 'noite', 'corpo', 'Ceia', 14),
  ('noite-oracao', 'noite', 'espirito', 'Oração e organização', 15)
on conflict (id) do nothing;

create table if not exists public.habit_routines (
  user_id uuid primary key references auth.users (id) on delete cascade,
  personalized boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  catalog_habit_id text references public.habit_catalog (id) on delete restrict,
  custom_label text,
  period text not null,
  pillar text not null,
  sort_order integer not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_habits_period_valid check (period in ('manha', 'tarde', 'noite')),
  constraint user_habits_pillar_valid check (pillar in ('corpo', 'mente', 'espirito')),
  constraint user_habits_origin_valid check (
    (
      catalog_habit_id is not null
      and custom_label is null
    )
    or (
      catalog_habit_id is null
      and custom_label is not null
      and length(btrim(custom_label)) > 0
    )
  )
);

create unique index if not exists user_habits_user_catalog_unique
  on public.user_habits (user_id, catalog_habit_id)
  where catalog_habit_id is not null;

create index if not exists user_habits_user_order_idx
  on public.user_habits (user_id, sort_order);

drop trigger if exists habit_routines_set_updated_at on public.habit_routines;
create trigger habit_routines_set_updated_at
before update on public.habit_routines
for each row execute function public.set_updated_at();

drop trigger if exists user_habits_set_updated_at on public.user_habits;
create trigger user_habits_set_updated_at
before update on public.user_habits
for each row execute function public.set_updated_at();

alter table public.habit_catalog enable row level security;
alter table public.habit_routines enable row level security;
alter table public.user_habits enable row level security;

revoke all on table public.habit_catalog from public, anon;
revoke all on table public.habit_routines from public, anon;
revoke all on table public.user_habits from public, anon;

grant select on table public.habit_catalog to authenticated;
grant select, insert, update, delete on table public.habit_routines to authenticated;
grant select, insert, update, delete on table public.user_habits to authenticated;

drop policy if exists habit_catalog_select_authenticated on public.habit_catalog;
create policy habit_catalog_select_authenticated
on public.habit_catalog
for select
to authenticated
using (true);

drop policy if exists habit_routines_select_own on public.habit_routines;
create policy habit_routines_select_own
on public.habit_routines
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists habit_routines_insert_own on public.habit_routines;
create policy habit_routines_insert_own
on public.habit_routines
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists habit_routines_update_own on public.habit_routines;
create policy habit_routines_update_own
on public.habit_routines
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists habit_routines_delete_own on public.habit_routines;
create policy habit_routines_delete_own
on public.habit_routines
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists user_habits_select_own on public.user_habits;
create policy user_habits_select_own
on public.user_habits
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists user_habits_insert_own on public.user_habits;
create policy user_habits_insert_own
on public.user_habits
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists user_habits_update_own on public.user_habits;
create policy user_habits_update_own
on public.user_habits
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists user_habits_delete_own on public.user_habits;
create policy user_habits_delete_own
on public.user_habits
for delete
to authenticated
using (auth.uid() = user_id);
