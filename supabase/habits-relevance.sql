-- UTime: relevância da rotina personalizada.
-- Execute este arquivo manualmente no SQL Editor do Supabase, depois de supabase/habits.sql.
-- Ele só adiciona public.user_habits.relevance. Não recria tabelas, não apaga linhas
-- e não altera policies, ranking, progresso ou pontuação.
-- Linhas já existentes ficam com relevance nula até o próprio usuário escolher.

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
end
$$;
