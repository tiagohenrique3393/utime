-- UTime: relevância obrigatória só em inclusões novas.
-- Execute este arquivo no SQL Editor do Supabase DEPOIS que a interface nova
-- estiver publicada. O aplicativo que está no ar hoje ainda grava relevância
-- nula ao criar um hábito personalizado; se este gatilho entrar antes, essa
-- criação passa a falhar.
--
-- Não preenche linhas antigas, não apaga dados e não altera o check
-- que continua aceitando relevância nula nas linhas já gravadas.
-- Atualizar um hábito antigo pode manter a relevância vazia.
-- Não mexe em circle_events: a relevância pontuada continua a cópia feita
-- no momento do check-in.
--
-- O check-in de hábito sem relevância é outro arquivo e pode ser aplicado
-- antes, com o aplicativo atual: supabase/circle-custom-checkin.sql.
-- Não execute supabase/circle.sql de novo por causa desta mudança.

create or replace function public.user_habits_require_relevance()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.relevance is null or new.relevance not in ('alta', 'media', 'baixa') then
    raise exception 'habit relevance required';
  end if;
  return new;
end;
$$;

drop trigger if exists user_habits_require_relevance on public.user_habits;
create trigger user_habits_require_relevance
before insert on public.user_habits
for each row execute function public.user_habits_require_relevance();

revoke all on function public.user_habits_require_relevance() from public, anon;
grant execute on function public.user_habits_require_relevance() to authenticated;
