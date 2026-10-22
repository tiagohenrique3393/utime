import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sql = readFileSync(resolve('supabase/delete-account.sql'), 'utf8');

function assert(condition, label) {
  if (!condition) {
    throw new Error(label);
  }
}

const ownDeletes = [
  'delete from public.habit_day_logs where user_id = uid;',
  'delete from public.circle_events where user_id = uid;',
  'delete from public.hydration_days where user_id = uid;',
  'delete from public.day_celebrations where user_id = uid;',
  'delete from public.user_habits where user_id = uid;',
  'delete from public.habit_routines where user_id = uid;',
  'delete from public.circle_friends where owner_id = uid or friend_id = uid;',
  'delete from public.circle_memberships where user_id = uid;',
  'delete from public.circle_results where user_id = uid;',
  'delete from public.journey_days where user_id = uid;',
  'delete from public.journey_state where user_id = uid;',
  'delete from public.profiles where user_id = uid;',
  'delete from auth.users where id = uid;',
];

for (const statement of ownDeletes) {
  assert(sql.includes(statement), `falta ${statement}`);
}

for (const preserved of ['habit_catalog', 'circle_personal_habits', 'circle_closures', 'circle_setup']) {
  assert(!new RegExp(`delete\\s+from\\s+public\\.${preserved}\\b`, 'i').test(sql), `preserva ${preserved}`);
}

assert(!/delete\s+from\s+storage\.objects/i.test(sql), 'nao apaga storage.objects');
assert(!sql.includes('execute format'), 'sem delete dinamico');
assert(sql.includes('uid uuid := auth.uid()'), 'identidade da sessao');
assert(!sql.includes('user_id uuid'), 'pesquisa sem identificador');
assert(/function public\.delete_own_account\(\s*reason text/s.test(sql), 'sem id de terceiro');
assert(
  sql.includes('grant execute on function public.delete_own_account(text, text, text) to authenticated;'),
  'somente autenticado',
);
assert(
  sql.includes('revoke all on function public.delete_own_account(text, text, text) from public, anon;'),
  'anon bloqueado',
);
