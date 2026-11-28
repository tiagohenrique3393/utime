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
  { localDate: '2026-11-26', score: 70, hours: 7, quality: 6 },
  { localDate: '2026-11-27', score: 90, hours: 8, quality: 10 },
];
const mood = [
  { localDate: '2026-11-27', period: 'manha' as const, score: 80, level: 8 },
  { localDate: '2026-11-27', period: 'tarde' as const, score: 100, level: 10 },
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
assertEqual(series.lineStyle, 'curve', 'dia com curva suave (padrão visual da semana)');
assertEqual(series.sleepScore, 90, 'sono score');
assertEqual(series.moodScore, 90, 'humor score');
assert(series.timed?.sleep?.[0]?.value === 90, 'sono timed');
assert(series.timed?.mood?.length === 2, 'humor timed slots');
assertEqual(series.timed?.habits?.[0], { fraction: 0, value: 0 }, 'hábitos começam em 0');
// Horários reais distintos por tipo de check-in (manhã 6h, sono ~7h, tarde 15h)
assertEqual(series.timed!.mood![0].fraction, 6 / 24, 'humor manhã em 06h');
assertEqual(series.timed!.sleep![0].fraction, 7 / 24, 'sono ~07h');
assert(series.timed!.mood![0].fraction < series.timed!.mood![1].fraction, 'humor cronológico');
// Ponta do humor = média do card (90); primeiro ponto preserva o check-in real (80)
assertEqual(series.timed!.mood![0].value, 80, 'humor manhã real');
assertEqual(series.timed!.mood![1].value, 90, 'ponta humor = score do card');
assertEqual(series.moodScore, 90, 'card humor');
assertEqual(series.timed!.sleep![0].value, series.sleepScore, 'ponta sono = card');

// Ordem invertida na origem dos dados não pode cruzar a curva
const shuffledMood = wellbeingSeries({
  today: '2026-11-27',
  period: 'dia',
  sleep: [],
  mood: [
    { localDate: '2026-11-27', period: 'noite' as const, score: 70, level: 7 },
    { localDate: '2026-11-27', period: 'manha' as const, score: 90, level: 9 },
    { localDate: '2026-11-27', period: 'tarde' as const, score: 80, level: 8 },
  ],
  habits: [{ key: '2026-11-27', label: 'Hoje', value: 0 }],
});
assertEqual(
  shuffledMood.timed!.mood!.map((row) => row.fraction),
  [6 / 24, 15 / 24, 21 / 24],
  'humor sempre manhã→tarde→noite',
);
assertEqual(shuffledMood.timed!.mood![2].value, shuffledMood.moodScore, 'ponta = card após shuffle');

const steppedDay = wellbeingSeries({
  today: '2026-11-27',
  period: 'dia',
  sleep: [],
  mood: [],
  habits: [{ key: '2026-11-27', label: 'Hoje', value: 50 }],
  dayPlanned: 4,
  dayCompletedIds: ['a', 'b'],
  dayEvents: [
    { habitId: 'a', completed: true, recordedAt: '2026-11-27T09:00:00.000Z' },
    { habitId: 'b', completed: true, recordedAt: '2026-11-27T15:00:00.000Z' },
  ],
  now: new Date('2026-11-27T18:00:00.000Z'),
});
assertEqual(steppedDay.timed?.habits?.[0]?.value, 0, 'step 0');
assertEqual(steppedDay.timed?.habits?.[steppedDay.timed.habits.length - 1]?.value, 50, 'step = anel');
assert(steppedDay.timed!.habits.length >= 3, 'vários degraus');

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
assertEqual(week.labels[0], 'SEG', 'semana começa segunda');
assertEqual(week.labels[6], 'DOM', 'semana termina domingo');
assertEqual(week.lineStyle, 'curve', 'semana curva');

const year = wellbeingSeries({
  today: '2026-11-27',
  period: 'ano',
  sleep,
  mood,
  habits: [{ key: '2026-11', label: 'Nov', value: 70 }],
});
assertEqual(year.labels.length, 12, 'ano 12 meses');
assertEqual(year.labels[0], 'Jan', 'jan');
assertEqual(year.labels[9], 'Out', 'outubro presente nos labels');
assertEqual(year.labels[11], 'Dez', 'dez');
assertEqual(year.habit[11], null, 'dezembro futuro sem dado');
// Eixo anual visível: Jan, Mar, Mai, Jul, Set, Out, Nov, Dez (amostra + Outubro)
const yearAxisVisible = year.labels.filter((label, index) => {
  return (
    index === 0 ||
    index === year.labels.length - 1 ||
    index % Math.max(1, Math.ceil(year.labels.length / 6)) === 0 ||
    label === 'Out'
  );
});
assertEqual(yearAxisVisible, ['Jan', 'Mar', 'Mai', 'Jul', 'Set', 'Out', 'Nov', 'Dez'], 'eixo ano com Outubro');

const weeks = monthCalendarWeeks('2026-11-27');
assertEqual(weeks.length, 4, 'mês exatamente 4 divisões');
assertEqual(
  weeks.map((bucket) => bucket.label),
  ['1ª SEM', '2ª SEM', '3ª SEM', '4ª SEM'],
  'rótulos 1–4ª SEM',
);
assertEqual(weeks[0]?.dates[0], '2026-11-01', '1ª SEM começa no dia 1');
assertEqual(weeks[1]?.dates[0], '2026-11-08', '2ª SEM dia 8');
assertEqual(weeks[2]?.dates[0], '2026-11-15', '3ª SEM dia 15');
assertEqual(weeks[3]?.dates[0], '2026-11-22', '4ª SEM dia 22');
assert(weeks[3]!.dates.includes('2026-11-27'), '4ª SEM inclui dia 27');
assert(!weeks[3]!.dates.includes('2026-11-28'), 'não inclui futuro após hoje');

const fullMonth = monthCalendarWeeks('2026-11-30');
assertEqual(fullMonth.length, 4, 'novembro completo 4 buckets');
assertEqual(fullMonth[3]?.dates[fullMonth[3]!.dates.length - 1], '2026-11-30', '4ª SEM até dia 30');
const feb = monthCalendarWeeks('2026-02-28');
assertEqual(feb.length, 4, 'fevereiro 4 buckets');
assertEqual(feb[3]?.dates[feb[3]!.dates.length - 1], '2026-02-28', 'fev até 28');

assertEqual(previousPeriodDates('2026-11-27', 'dia'), ['2026-11-26'], 'ontem');
assertEqual(currentPeriodDates('2026-11-27', 'dia'), ['2026-11-27'], 'hoje');

console.log('progress-wellbeing-ok');
