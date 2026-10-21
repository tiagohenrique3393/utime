-- Celebrações diárias de 70% e 100% do UTime.
-- Execute uma vez no SQL Editor, se a tabela ainda não existir.
-- Não altera hábitos, registros, pontuação, ranking, assinaturas nem políticas existentes.

create table if not exists public.day_celebrations (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  kind text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day, kind),
  constraint day_celebrations_kind_valid check (kind in ('meta', 'excelencia'))
);

alter table public.day_celebrations enable row level security;

revoke all on table public.day_celebrations from public, anon;

grant select, insert on table public.day_celebrations to authenticated;

drop policy if exists day_celebrations_select_own on public.day_celebrations;
create policy day_celebrations_select_own
on public.day_celebrations
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists day_celebrations_insert_own on public.day_celebrations;
create policy day_celebrations_insert_own
on public.day_celebrations
for insert
to authenticated
with check (auth.uid() = user_id);
