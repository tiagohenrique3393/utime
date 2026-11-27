import { clampSleepHours, formatSleepHours, sleepQualityPercent, sleepQuantityPercent, sleepScore } from '@/lib/sleep-score';

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

assertEqual(clampSleepHours(7.4), 7.5, 'step 0.5');
assertEqual(clampSleepHours(-1), 0, 'min');
assertEqual(clampSleepHours(20), 12, 'max');
assertEqual(sleepQuantityPercent(8, 8), 100, 'meta cheia');
assertEqual(sleepQuantityPercent(4, 8), 50, 'metade');
assertEqual(sleepQuantityPercent(10, 8), 100, 'acima da meta cap 100');
assertEqual(sleepQualityPercent(1), 20, 'q1');
assertEqual(sleepQualityPercent(5), 100, 'q5');
assertEqual(sleepQualityPercent(0), null, 'q inválida');
assertEqual(sleepScore(8, 5, 8), 100, 'excelente');
assertEqual(sleepScore(4, 1, 8), 35, 'baixo');
assertEqual(formatSleepHours(7.5), '7,5', 'formato pt-BR');

console.log('sleep-score-ok');
