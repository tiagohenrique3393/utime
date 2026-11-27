import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function assert(condition, label) {
  if (!condition) {
    throw new Error(label);
  }
}

const sql = readFileSync(resolve('supabase/sleep-mood-checkins.sql'), 'utf8');
assert(sql.includes('create table if not exists public.sleep_checkins'), 'sleep table');
assert(sql.includes('create table if not exists public.mood_checkins'), 'mood table');
assert(sql.includes('create table if not exists public.checkin_prompt_state'), 'prompt table');
assert(sql.includes('enable row level security'), 'RLS');
assert(sql.includes('auth.uid() = user_id'), 'own rows');
assert(sql.includes('on delete cascade'), 'cascade');
assert(!/disable\s+row\s+level\s+security/i.test(sql), 'não desliga RLS');
assert(!/service_role/i.test(sql), 'sem service_role');
assert(!/drop\s+table/i.test(sql), 'não dropa tabela');

const deletion = readFileSync(resolve('supabase/delete-account.sql'), 'utf8');
assert(deletion.includes('sleep_checkins'), 'delete sleep');
assert(deletion.includes('mood_checkins'), 'delete mood');
assert(deletion.includes('checkin_prompt_state'), 'delete prompts');

console.log('sleep-mood-sql-ok');
