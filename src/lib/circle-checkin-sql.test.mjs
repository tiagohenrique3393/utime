import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function assert(condition, label) {
  if (!condition) {
    throw new Error(label);
  }
}

const files = ['supabase/circle.sql', 'supabase/circle-custom-checkin.sql'];
for (const file of files) {
  const sql = readFileSync(resolve(file), 'utf8');
  assert(sql.includes('is not true'), `${file} trata NULL como fora do ranking`);
  assert(sql.includes('select coalesce('), `${file} não devolve NULL na função de ranking`);
  assert(!sql.includes('if not public.circle_ranking_habit'), `${file} não usa IF NOT no gatilho`);
  assert(!/drop\s+table/i.test(sql), `${file} não apaga tabela`);
  assert(!/truncate/i.test(sql), `${file} não esvazia tabela`);
  assert(!/delete\s+from\s+public\.(user_habits|habit_day_logs|profiles)/i.test(sql), `${file} não apaga hábitos nem conclusões`);
}

const migration = readFileSync(resolve('supabase/circle-custom-checkin.sql'), 'utf8');
assert(!/disable\s+row\s+level\s+security/i.test(migration), 'a correção não desliga RLS');
assert(migration.includes('delete from public.circle_events event'), 'desmarcar ainda remove só o evento daquele hábito');

console.log('circle-checkin-sql-ok');
