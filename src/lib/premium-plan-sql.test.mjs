import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sql = readFileSync(resolve('supabase/premium-plan-rpc.sql'), 'utf8');

function assert(condition, label) {
  if (!condition) {
    throw new Error(label);
  }
}

assert(sql.includes('create or replace function public.utime_my_plan()'), 'cria utime_my_plan');
assert(sql.includes('security definer'), 'security definer');
assert(sql.includes("grant execute on function public.utime_my_plan() to authenticated"), 'grant authenticated');
assert(sql.includes('revoke all on function public.utime_my_plan() from public, anon'), 'revoke anon');
assert(sql.includes('thsouza00793@gmail.com'), 'tiago');
assert(sql.includes('francinegodinhodossantos@gmail.com'), 'francine');
assert(sql.includes("plan = 'premium'"), 'atualiza premium');
assert(sql.includes("notify pgrst, 'reload schema'"), 'recarrega schema');
assert(!/disable row level security/i.test(sql), 'não desliga RLS');
assert(!/service_role/i.test(sql), 'não expõe service_role');

console.log('premium-plan-sql ok');
