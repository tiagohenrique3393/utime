import {
  currentPeriodDates,
  monthCalendarWeeks,
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

function assert(condition: boolean, label: string) {
  if (!condition) {
    throw new Error(label);
  }
}

const sleep = [
  { localDate: '2026-11-26', score: 70, hours: 7, quality: 3 },
  { localDate: '2026-11-27', score: 90, hours: 8, quality: 5 },
];
const mood = [
  { localDate: '2026-11-27', period: 'manha' as const, score: 80, level: 4 },
  { localDate: '2026-11-27', period: 'tarde' as const, score: 100, level: 5 },
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
assertEqual(series.labels, ['00h', '06h', '12h', '18h', '23:59'], 'eixo dia');
assertEqual(series.sleepScore, 90, 'sono score');
assertEqual(series.moodScore, 90, 'humor score');
assert(series.timed?.sleep?.[0]?.value === 90, 'sono timed');
assert(series.timed?.mood?.length === 2, 'humor timed slots');

const week = wellbeingSeries({
  today: '2026-11-27',
  period: 'semana',
  sleep,
  mood,
  habits: [
    { key: '2026-11-23', label: 'Seg', value: 40 },
    { key: '2026-11-27', label: 'Sex', value: 36.36 },
  ],
});
assertEqual(week.labels.length, 7, 'semana 7 dias');
assertEqual(week.labels[0], 'Seg', 'semana começa segunda');
assertEqual(week.labels[6], 'Dom', 'semana termina domingo');

const year = wellbeingSeries({
  today: '2026-11-27',
  period: 'ano',
  sleep,
  mood,
  habits: [{ key: '2026-11', label: 'Nov', value: 70 }],
});
assertEqual(year.labels.length, 12, 'ano 12 meses');
assertEqual(year.labels[0], 'Jan', 'jan');
assertEqual(year.labels[11], 'Dez', 'dez');
assertEqual(year.habit[11], null, 'dezembro futuro sem dado');

const weeks = monthCalendarWeeks('2026-11-27');
assert(weeks.length >= 4, 'mês tem ao menos 4 semanas');
assert(weeks.some((bucket) => bucket.label.includes('SEM')), 'rótulos semanais');

assertEqual(previousPeriodDates('2026-11-27', 'dia'), ['2026-11-26'], 'ontem');
assertEqual(currentPeriodDates('2026-11-27', 'dia'), ['2026-11-27'], 'hoje');

console.log('progress-wellbeing-ok');
