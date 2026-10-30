import { completionCreatesEvent } from '@/lib/circle';

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${String(expected)}, obtido ${String(actual)}`);
  }
}

// IF NOT no PL/pgSQL só entra quando o resultado é true. NOT NULL continua NULL.
function plpgsqlTakesIfNot(value: boolean | null) {
  const negated = value === null ? null : !value;
  return negated === true;
}

assertEqual(plpgsqlTakesIfNot(null), false, 'relevância nula não entra em IF NOT');
assertEqual(plpgsqlTakesIfNot(false), true, 'hábito fora do ranking entra em IF NOT');
assertEqual(plpgsqlTakesIfNot(true), false, 'hábito pontuável segue para o evento');

assertEqual(
  completionCreatesEvent({
    operation: 'insert',
    completed: true,
    occurredOn: '2026-10-30',
    today: '2026-10-30',
    relevance: null,
    catalogHabitId: null,
  }),
  false,
  'hábito personalizado sem relevância não pontua',
);
assertEqual(
  completionCreatesEvent({
    operation: 'insert',
    completed: true,
    occurredOn: '2026-10-30',
    today: '2026-10-30',
    relevance: 'baixa',
    catalogHabitId: null,
  }),
  true,
  'hábito personalizado com relevância continua elegível',
);

console.log('circle-checkin-ok');
