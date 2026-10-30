import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function assert(condition, label) {
  if (!condition) {
    throw new Error(label);
  }
}

const live = readFileSync(resolve('supabase/circle-2.sql'), 'utf8');
const fix = readFileSync(resolve('supabase/circle-accept-fix.sql'), 'utf8');
const accept = live.slice(live.indexOf('create or replace function public.circle_accept_friend'));

assert(accept.includes('on conflict (owner_id, friend_id) do nothing'), 'a função publicada ainda usa a coluna que o parâmetro substitui');
assert(accept.includes('request.to_id = uid'), 'só o destinatário encontra o próprio pedido');
assert(fix.includes('execute'), 'o aceite corrigido grava fora da substituição do parâmetro');
assert(fix.includes('on conflict on constraint circle_friends_pkey do nothing'), 'o aceite usa a chave primária pelo nome');
assert(!fix.includes('on conflict (owner_id, friend_id)'), 'o script novo não repete o alvo quebrado');
assert(fix.includes('sender = uid'), 'o aceite continua impedindo amizade consigo');
assert(fix.includes('request.to_id = uid'), 'o aceite continua restrito ao destinatário');
assert(fix.includes('grant execute on function public.circle_accept_friend(uuid) to authenticated'), 'só a sessão autenticada executa o aceite');
assert(!/drop\s+table/i.test(fix), 'o aceite não apaga tabela');
assert(!/truncate/i.test(fix), 'o aceite não esvazia tabela');
assert(!/disable\s+row\s+level\s+security/i.test(fix), 'o aceite não desliga RLS');
assert(!/service_role/i.test(fix), 'o aceite não usa service_role');

console.log('circle-accept-sql-ok');
