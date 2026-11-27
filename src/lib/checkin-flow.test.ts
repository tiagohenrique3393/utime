import { nextCheckinStep } from '@/lib/checkin-flow';
import { progressInsight, moodDetailInsight, sleepDetailInsight } from '@/lib/checkin-insights';
import { compareVsLabel, relativePercentDelta } from '@/lib/progress-compare';

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

assertEqual(
  nextCheckinStep({ habitEligible: true, sleepEligible: true, moodEligible: true, moodPeriod: 'tarde' }),
  { kind: 'next_habit' },
  'hábito primeiro',
);
assertEqual(
  nextCheckinStep({ habitEligible: false, sleepEligible: true, moodEligible: true, moodPeriod: 'tarde' }),
  { kind: 'sleep' },
  'sono depois',
);
assertEqual(
  nextCheckinStep({ habitEligible: false, sleepEligible: false, moodEligible: true, moodPeriod: 'noite' }),
  { kind: 'mood', period: 'noite' },
  'humor por último',
);
assertEqual(
  nextCheckinStep({ habitEligible: false, sleepEligible: false, moodEligible: false, moodPeriod: 'manha' }),
  null,
  'nada',
);

assertEqual(relativePercentDelta(80, 70).kind, 'delta', 'delta ok');
assertEqual(relativePercentDelta(null, 70).label, 'SEM COMPARAÇÃO', 'sem base');
assertEqual(compareVsLabel('dia', { kind: 'delta', delta: 12, label: '↗ +12%' }), '↗ +12% vs. ontem', 'label dia');

assertEqual(
  progressInsight(
    { habitPercent: 80, sleepPercent: 85, moodPercent: 70, habitDelta: 5, sleepDelta: 2, moodDelta: 1 },
    'semana',
  ).toLowerCase().includes('ritmo'),
  true,
  'insight sono+hábitos',
);
assertEqual(
  progressInsight(
    { habitPercent: 80, sleepPercent: 85, moodPercent: 70, habitDelta: 5, sleepDelta: 2, moodDelta: 1 },
    'semana',
  ).startsWith('INSIGHT:'),
  false,
  'sem prefixo duplicado',
);
assertEqual(sleepDetailInsight(null, null).toLowerCase().includes('sem registro'), true, 'sono vazio');
assertEqual(moodDetailInsight(90).toLowerCase().includes('elevado'), true, 'humor alto');

console.log('checkin-flow-ok');
