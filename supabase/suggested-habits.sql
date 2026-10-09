-- UTime: 10 hábitos sugeridos para a rotina padrão.
-- Execute este arquivo manualmente no SQL Editor do Supabase, depois de supabase/habits.sql.
-- Ele apenas inclui linhas novas em habit_catalog.
-- Não apaga os 15 hábitos antigos, não altera user_habits, habit_day_logs,
-- habit_routines, profiles, journey_days, journey_state, ranking nem RLS.

insert into public.habit_catalog (id, period, pillar, label, sort_order)
values
  ('corpo-atividade', 'tarde', 'corpo', 'Praticar atividade física', 101),
  ('corpo-refeicao', 'manha', 'corpo', 'Preparar uma refeição equilibrada', 102),
  ('corpo-hidratacao', 'manha', 'corpo', 'Cumprir meta pessoal de hidratação', 103),
  ('corpo-higiene', 'manha', 'corpo', 'Realizar cuidados de higiene bucal', 104),
  ('mente-estudo', 'manha', 'mente', 'Estudar ou desenvolver uma habilidade', 105),
  ('mente-leitura', 'noite', 'mente', 'Ler', 106),
  ('mente-prioridades', 'manha', 'mente', 'Definir as prioridades do dia', 107),
  ('espirito-meditacao', 'manha', 'espirito', 'Meditar ou refletir', 108),
  ('espirito-atencao', 'tarde', 'espirito', 'Dedicar atenção a alguém importante', 109),
  ('espirito-gratidao', 'noite', 'espirito', 'Registrar algo pelo qual é grato', 110)
on conflict (id) do nothing;
