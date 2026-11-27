import {
  canEditMoodPeriod,
  dailyMoodAverage,
  migrateLegacyMoodLevel,
  moodLevelScore,
  moodPeriodAt,
  moodPeriodIndex,
  moodPeriodOrdinal,
} from '@/lib/mood-score';

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

assertEqual(moodLevelScore(0), 0, 'l0');
assertEqual(moodLevelScore(4), 40, 'l4');
assertEqual(moodLevelScore(7), 70, 'l7');
assertEqual(moodLevelScore(8), 80, 'l8');
assertEqual(moodLevelScore(10), 100, 'l10');
assertEqual(moodLevelScore(11), null, 'inválido');
assertEqual(migrateLegacyMoodLevel(5), 10, 'legado 5→10');
assertEqual(dailyMoodAverage([60, 80, 100]), 80, 'média 3');
assertEqual(dailyMoodAverage([null, 80, undefined]), 80, 'ignora ausentes');
assertEqual(dailyMoodAverage([null, null]), null, 'vazio');
assertEqual(moodPeriodIndex('manha'), 1, 'manhã');
assertEqual(moodPeriodOrdinal('noite'), 'NOITE • 3 DE 3', 'noite');

const morning = new Date('2026-11-27T08:00:00-03:00');
const afternoon = new Date('2026-11-27T14:00:00-03:00');
const night = new Date('2026-11-27T20:00:00-03:00');
assertEqual(moodPeriodAt(morning), 'manha', 'periodo manhã');
assertEqual(moodPeriodAt(afternoon), 'tarde', 'periodo tarde');
assertEqual(moodPeriodAt(night), 'noite', 'periodo noite');
assertEqual(canEditMoodPeriod('manha', '2026-11-27', '2026-11-27', afternoon), true, 'edit manhã à tarde');
assertEqual(canEditMoodPeriod('noite', '2026-11-27', '2026-11-27', afternoon), false, 'noite futura');
assertEqual(canEditMoodPeriod('tarde', '2026-11-26', '2026-11-27', afternoon), true, 'dia anterior ok');

console.log('mood-score-ok');
