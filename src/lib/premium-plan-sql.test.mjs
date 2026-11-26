import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sql = readFileSync(resolve('supabase/premium-plan-rpc.sql'), 'utf8');

function assert(condition, label) {
  if (!condition) {
    throw new Error(label);
  }
}

assert(sql.includes('create or replace function public.utime_my_plan()'), 'cria utime_my_plan');
assert(sql.includes('utime_ensure_lifetime_plan'), 'repara identidade atual');
assert(sql.includes('utime_lifetime_emails'), 'lista vitalícia no servidor');
assert(sql.includes('utime.allow_plan_change'), 'bypass controlado do trigger');
assert(sql.includes('auth.identities'), 'cobre identidades Google/etc');
assert(sql.includes('thsouza00793@gmail.com'), 'tiago');
assert(sql.includes('francinegodinhodossantos@gmail.com'), 'francine');
assert(/volatile/i.test(sql), 'utime_my_plan volatile');
assert(sql.includes("grant execute on function public.utime_my_plan() to authenticated"), 'grant authenticated');
assert(sql.includes('revoke all on function public.utime_my_plan() from public, anon'), 'revoke anon');
assert(sql.includes("notify pgrst, 'reload schema'"), 'recarrega schema');
assert(!/disable row level security/i.test(sql), 'não desliga RLS');
assert(!/service_role/i.test(sql), 'não expõe service_role');
assert(!sql.includes('grant execute on function public.utime_ensure_lifetime_plan'), 'ensure não é público');

console.log('premium-plan-sql ok');
