import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sql = readFileSync(resolve('supabase/delete-account.sql'), 'utf8');
const diagnose = readFileSync(resolve('supabase/delete-account-diagnose.sql'), 'utf8');

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
  'delete from public.circle_friend_requests where from_id = uid or to_id = uid;',
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
assert(!/execute\s+(?:pg_catalog\.)?format\(\s*'delete/i.test(sql), 'sem delete dinamico');
assert(/execute\s+pg_catalog\.format\(\s*'select count\(\*\)/i.test(sql), 'conta vinculos sem cascade');
assert((sql.match(/execute\s+(?:pg_catalog\.)?format\(/gi) ?? []).length === 1, 'um unico execute');
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
assert(
  sql.includes('alter function public.delete_own_account(text, text, text) owner to postgres;'),
  'dono postgres',
);
assert(sql.includes("raise exception 'avatar files remain'"), 'foto restante interrompe');
assert(sql.includes("raise exception 'account delete blocked'"), 'vinculo sem cascade interrompe');

const avatarAt = sql.indexOf("raise exception 'avatar files remain'");
const blockedAt = sql.indexOf("raise exception 'account delete blocked'");
const authAt = sql.indexOf('delete from auth.users where id = uid;');
assert(avatarAt > 0 && avatarAt < authAt, 'foto restante antes do auth');
assert(blockedAt > avatarAt && blockedAt < authAt, 'vinculo antes do auth');
assert((sql.match(/when others then/gi) ?? []).length === 3, 'so a pesquisa e o agendamento ignoram erro');
assert(!/\b(insert|update|delete|drop|create|alter|truncate|grant|revoke|execute)\b/i.test(diagnose), 'diagnostico somente leitura');
assert(diagnose.includes('auth.users'), 'diagnostico lista vinculos de auth.users');
assert(diagnose.includes('storage.objects'), 'diagnostico lista politicas do storage');
