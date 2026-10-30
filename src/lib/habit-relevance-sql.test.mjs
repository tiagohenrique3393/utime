import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function assert(condition, label) {
  if (!condition) {
    throw new Error(label);
  }
}

const required = readFileSync(resolve('supabase/habit-relevance-required.sql'), 'utf8');
const circle = readFileSync(resolve('supabase/circle.sql'), 'utf8');
const checkin = readFileSync(resolve('supabase/circle-custom-checkin.sql'), 'utf8');
const habits = readFileSync(resolve('supabase/habits.sql'), 'utf8');

assert(required.includes("new.relevance not in ('alta', 'media', 'baixa')"), 'o gatilho só aceita os três valores');
assert(required.includes('before insert on public.user_habits'), 'a exigência vale para inclusão, não para edição');
assert(!/before\s+update/i.test(required), 'atualizar um hábito antigo continua podendo manter relevância nula');
assert(!/update\s+public\.user_habits\s+set\s+relevance/i.test(required), 'não há backfill de relevância');
assert(!/insert\s+into\s+public\.circle_events/i.test(required), 'o gatilho novo não grava evento do Circle');
assert(!/update\s+public\.circle_events/i.test(required), 'o gatilho novo não reescreve evento do Circle');
assert(!/delete\s+from\s+public\.circle_events/i.test(required), 'o gatilho novo não apaga evento do Circle');
assert(!/drop\s+table/i.test(required), 'não apaga tabela');
assert(!/truncate/i.test(required), 'não esvazia tabela');
assert(!/delete\s+from/i.test(required), 'não apaga linhas');
assert(!/disable\s+row\s+level\s+security/i.test(required), 'não desliga RLS');
assert(required.includes('grant execute on function public.user_habits_require_relevance() to authenticated'), 'só a sessão autenticada executa a validação');
assert(required.includes('revoke all on function public.user_habits_require_relevance() from public, anon'), 'anon não executa a validação');

assert(circle.includes('relevance is null or relevance in'), 'o check existente preserva relevância nula');
assert(circle.includes('on conflict (user_id, user_habit_id, occurred_on) do nothing'), 'check-in repetido não troca a relevância gravada');
assert(!/update\s+public\.circle_events/i.test(circle), 'não existe atualização de evento já pontuado');
assert(circle.includes('values (new.user_id, new.user_habit_id, new.occurred_on, rel)'), 'o evento copia a relevância do instante da conclusão');
assert(checkin.includes('values (new.user_id, new.user_habit_id, new.occurred_on, rel)'), 'a correção do check-in mantém o mesmo snapshot');

const enrollStart = circle.indexOf('function public.circle_enroll()');
const leaveStart = circle.indexOf('function public.circle_leave()');
const enroll = circle.slice(enrollStart, leaveStart);
assert(enroll.includes('circle requirements missing'), 'a inscrição recusa quem não tem os mínimos');
assert(enroll.includes('left_at is null'), 'a inscrição reconhece quem já participa');
assert(!/set\s+left_at/i.test(enroll), 'quem já participa não é desligado quando a rotina muda');
assert(!/delete\s+from\s+public\.circle_memberships/i.test(enroll), 'a inscrição não apaga o histórico');

assert(habits.includes('auth.uid() = user_id'), 'hábitos continuam isolados pelo usuário autenticado');
assert(habits.includes('user_habits_select_own'), 'a leitura da rotina tem política própria');
assert(habits.includes('user_habits_insert_own'), 'a inclusão da rotina tem política própria');
assert(habits.includes('user_habits_update_own'), 'a edição da rotina tem política própria');
assert(circle.includes('uid is distinct from auth.uid()'), 'a contagem do Circle não aceita o id de outra pessoa');

console.log('habit-relevance-sql-ok');
