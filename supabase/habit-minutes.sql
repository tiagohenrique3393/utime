-- Duração opcional dos hábitos do UTime.
-- Execute uma vez no SQL Editor, se a coluna ainda não existir.
-- Não altera pontuação, histórico, RLS nem hábitos já gravados.

alter table public.user_habits
  add column if not exists minutes integer;

alter table public.user_habits
  drop constraint if exists user_habits_minutes_valid;

alter table public.user_habits
  add constraint user_habits_minutes_valid
  check (minutes is null or (minutes >= 0 and minutes <= 1440));
