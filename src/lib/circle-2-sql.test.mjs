import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function assert(condition, label) {
  if (!condition) {
    throw new Error(label);
  }
}

const circle = readFileSync(resolve('supabase/circle.sql'), 'utf8');
const incremental = readFileSync(resolve('supabase/circle-2.sql'), 'utf8');
const removal = readFileSync(resolve('supabase/delete-account.sql'), 'utf8');

for (const file of ['supabase/circle.sql', 'supabase/circle-2.sql']) {
  const sql = readFileSync(resolve(file), 'utf8');
  assert(sql.includes('public.circle_friend_requests'), `${file} cria o pedido de amizade`);
  assert(sql.includes('circle_accept_friend'), `${file} aceita só pelo destinatário`);
  assert(sql.includes('circle_decline_friend'), `${file} recusa o pedido`);
  assert(sql.includes('public.circle_history'), `${file} lê o histórico do dono`);
  assert(sql.includes('cycle.joined_at <= event.recorded_at'), `${file} limita o ponto ao ciclo`);
  assert(sql.includes('event.recorded_at < cycle.left_at'), `${file} corta o ponto na saída`);
  assert(sql.includes('membership.left_at >= finish_at'), `${file} não premia quem abandonou`);
  assert(sql.includes('back.friend_id = uid'), `${file} exige amizade nos dois sentidos`);
  assert(sql.includes('request.from_id = sender'), `${file} o remetente não aceita o próprio pedido`);
  assert(/on conflict \(period_kind, period_start, user_id\) do nothing/i.test(sql), `${file} não duplica conquista`);
  assert(!/drop\s+table/i.test(sql), `${file} não apaga tabela`);
  assert(!/truncate/i.test(sql), `${file} não esvazia tabela`);
  assert(!/delete\s+from\s+public\.(user_habits|habit_day_logs|profiles)\b/i.test(sql), `${file} não apaga hábitos nem perfil`);
  assert(!/disable\s+row\s+level\s+security/i.test(sql), `${file} não desliga RLS`);
}

assert(circle.includes("kind not in ('semana', 'mes', 'ano')"), 'histórico só aceita os três períodos');
assert(incremental.includes("kind not in ('semana', 'mes', 'ano')"), 'incremental limita o histórico');
assert(circle.includes('result.user_id = uid'), 'histórico não recebe id de terceiro');
assert(incremental.includes('result.user_id = uid'), 'incremental não recebe id de terceiro');
assert(incremental.includes('limit 200'), 'o placar não devolve a lista inteira');
assert(!incremental.includes('relevance-log-backfill'), 'o incremental não recarrega check-ins antigos');
assert(incremental.includes('is not true'), 'o incremental trata relevância nula no check-in');
assert(!/delete\s+from\s+public\.circle_results\b/i.test(incremental), 'o incremental não apaga conquistas');
assert(!/delete\s+from\s+public\.circle_memberships\b/i.test(incremental), 'o incremental não apaga participações');
assert(removal.includes('delete from public.circle_friend_requests where from_id = uid or to_id = uid;'), 'exclusão apaga os pedidos da própria conta');
assert(circle.includes('on delete cascade'), 'pedido some com a conta');
assert(incremental.includes('on delete cascade'), 'o incremental também remove o pedido com a conta');

console.log('circle-2-sql-ok');
