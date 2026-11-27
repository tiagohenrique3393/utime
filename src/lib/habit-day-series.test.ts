import {
  cumulativeDayHabitsSeries,
  dayAxisLabels,
  dayFractionFromInstant,
  dayKeyFromInstant,
} from '@/lib/habit-day-series';

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assert(condition: boolean, label: string) {
  if (!condition) {
    throw new Error(label);
  }
}

assertEqual([...dayAxisLabels], ['00h', '06h', '12h', '18h', '23:59'], 'eixo oficial');

// 2026-11-27 12:00 America/Sao_Paulo = 15:00 UTC
const noonSp = new Date('2026-11-27T15:00:00.000Z');
assertEqual(dayKeyFromInstant(noonSp), '2026-11-27', 'chave SP');
assert(Math.abs(dayFractionFromInstant(noonSp) - 0.5) < 1e-6, 'fração meio-dia');

const empty = cumulativeDayHabitsSeries({
  dayKey: '2026-11-27',
  planned: 4,
  events: [],
  currentCompletedIds: [],
  now: noonSp,
  ringPercent: 0,
});
assertEqual(empty[0], { fraction: 0, value: 0 }, 'começa em 0%');
assertEqual(empty[empty.length - 1]?.value, 0, 'anel 0');

// Sem histórico intradía: não inventa horários no passado; reconcilia em "agora".
const legacy = cumulativeDayHabitsSeries({
  dayKey: '2026-11-27',
  planned: 4,
  events: [],
  currentCompletedIds: ['a', 'b'],
  now: noonSp,
  ringPercent: 50,
});
assertEqual(legacy[0], { fraction: 0, value: 0 }, 'legacy meia-noite');
assertEqual(legacy[legacy.length - 1]?.value, 50, 'legacy = anel');
assert(Math.abs((legacy[legacy.length - 1]?.fraction ?? -1) - 0.5) < 1e-6, 'legacy no agora');
assert(legacy.every((point) => (point.fraction ?? 0) <= 0.5 + 1e-9), 'sem futuro');

// Degraus reais com timestamps (06h e 12h SP).
const six = new Date('2026-11-27T09:00:00.000Z'); // 06h SP
const twelve = new Date('2026-11-27T15:00:00.000Z'); // 12h SP
const stepped = cumulativeDayHabitsSeries({
  dayKey: '2026-11-27',
  planned: 4,
  events: [
    { habitId: 'a', completed: true, recordedAt: six.toISOString() },
    { habitId: 'b', completed: true, recordedAt: twelve.toISOString() },
  ],
  currentCompletedIds: ['a', 'b'],
  now: new Date('2026-11-27T18:00:00.000Z'), // 15h SP
  ringPercent: 50,
});
assertEqual(stepped[0], { fraction: 0, value: 0 }, 'step start');
const atSix = stepped.find((point) => Math.abs(point.fraction - 0.25) < 1e-6);
assertEqual(atSix?.value, 25, '25% às 06h');
const atTwelve = stepped.find((point) => Math.abs(point.fraction - 0.5) < 1e-6);
assertEqual(atTwelve?.value, 50, '50% às 12h');
assertEqual(stepped[stepped.length - 1]?.value, 50, 'último = anel');

// Desmarcar reduz o % com evento real.
const unchecked = cumulativeDayHabitsSeries({
  dayKey: '2026-11-27',
  planned: 4,
  events: [
    { habitId: 'a', completed: true, recordedAt: six.toISOString() },
    { habitId: 'b', completed: true, recordedAt: twelve.toISOString() },
    { habitId: 'a', completed: false, recordedAt: new Date('2026-11-27T16:00:00.000Z').toISOString() }, // 13h SP
  ],
  currentCompletedIds: ['b'],
  now: new Date('2026-11-27T18:00:00.000Z'),
  ringPercent: 25,
});
const afterUncheck = unchecked.find((point) => Math.abs(point.fraction - 13 / 24) < 1e-6);
assertEqual(afterUncheck?.value, 25, 'desmarcar reduz');
assertEqual(unchecked[unchecked.length - 1]?.value, 25, 'anel após uncheck');

// Eventos futuros (depois de agora) não entram.
const futureBlocked = cumulativeDayHabitsSeries({
  dayKey: '2026-11-27',
  planned: 2,
  events: [
    { habitId: 'a', completed: true, recordedAt: six.toISOString() },
    { habitId: 'b', completed: true, recordedAt: new Date('2026-11-27T21:00:00.000Z').toISOString() }, // 18h SP
  ],
  currentCompletedIds: ['a'],
  now: noonSp, // 12h SP — evento das 18h ainda no futuro
  ringPercent: 50,
});
assert(
  futureBlocked.every((point) => (point.fraction ?? 0) <= 0.5 + 1e-9),
  'bloqueia futuro',
);
assertEqual(futureBlocked[futureBlocked.length - 1]?.value, 50, 'reconcilia anel sem futuro');

console.log('habit-day-series-ok');
