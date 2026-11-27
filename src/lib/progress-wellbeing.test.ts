import {
  currentPeriodDates,
  moodAverage,
  previousPeriodDates,
  sleepAverage,
  wellbeingSeries,
} from '@/lib/progress-wellbeing';

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

const sleep = [
  { localDate: '2026-11-26', score: 70 },
  { localDate: '2026-11-27', score: 90 },
];
const mood = [
  { localDate: '2026-11-27', period: 'manha' as const, score: 80 },
  { localDate: '2026-11-27', period: 'tarde' as const, score: 100 },
];

assertEqual(sleepAverage(['2026-11-27'], sleep), 90, 'sono dia');
assertEqual(moodAverage(['2026-11-27'], mood), 90, 'humor média períodos');
assertEqual(moodAverage(['2026-11-26'], mood), null, 'sem humor não vira 0');

const series = wellbeingSeries({
  today: '2026-11-27',
  period: 'dia',
  sleep,
  mood,
  habits: [{ key: '2026-11-27', label: 'Hoje', value: 36.36 }],
});
assertEqual(series.habit[0], 36.36, 'hábito');
assertEqual(series.sleep[0], 90, 'sono série');
assertEqual(series.mood[0], 90, 'humor série');

assertEqual(previousPeriodDates('2026-11-27', 'dia'), ['2026-11-26'], 'ontem');
assertEqual(currentPeriodDates('2026-11-27', 'dia'), ['2026-11-27'], 'hoje');

console.log('progress-wellbeing-ok');
