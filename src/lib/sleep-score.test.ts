import {
  clampSleepHours,
  clampSleepQuality,
  formatSleepHours,
  migrateLegacySleepQuality,
  sleepQualityPercent,
  sleepQuantityPercent,
  sleepScore,
} from '@/lib/sleep-score';

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

assertEqual(clampSleepHours(7.4), 7.5, 'step 0.5');
assertEqual(clampSleepHours(-1), 0, 'min');
assertEqual(clampSleepHours(20), 12, 'max');
assertEqual(sleepQuantityPercent(8, 8), 100, 'meta cheia');
assertEqual(sleepQuantityPercent(6, 8), 75, '6h/8h');
assertEqual(sleepQuantityPercent(10, 8), 100, 'acima da meta cap 100');
assertEqual(sleepQualityPercent(0), 0, 'q0');
assertEqual(sleepQualityPercent(8), 80, 'q8');
assertEqual(sleepQualityPercent(10), 100, 'q10');
assertEqual(sleepQualityPercent(11), null, 'q inválida');
assertEqual(clampSleepQuality(8), 8, 'clamp 8');
assertEqual(migrateLegacySleepQuality(4), 8, 'legado 4→8');
assertEqual(sleepScore(6, 8, 8), 77.5, 'exemplo 6h q8');
assertEqual(sleepScore(8, 10, 8), 100, 'excelente');
assertEqual(formatSleepHours(7.5), '7,5', 'formato pt-BR');

console.log('sleep-score-ok');
