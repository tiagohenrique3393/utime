import { celebrationForCompletion } from '@/lib/day-celebration';
import { habitsForScore, type DailyHabit } from '@/lib/daily-board';
import {
  addHydrationIntake,
  clearedHydration,
  formatHydrationPercent,
  hydrationDayView,
  hydrationFill,
  hydrationGoalsMl,
  hydrationPercent,
  isHydrationGoal,
} from '@/lib/hydration';

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${String(expected)}, obtido ${String(actual)}`);
  }
}

assertEqual(hydrationGoalsMl.length, 9, 'nove metas');
assertEqual(hydrationGoalsMl[0], 1000, 'primeira meta');
assertEqual(hydrationGoalsMl[8], 5000, 'última meta');
assertEqual(isHydrationGoal(3000), true, '3 litros');
assertEqual(isHydrationGoal(250), false, '250 ml não é meta');
assertEqual(isHydrationGoal(300), false, '300 ml é ingestão, não meta');

let consumed = 0;
consumed = addHydrationIntake(consumed, 500);
consumed = addHydrationIntake(consumed, 300);
consumed = addHydrationIntake(consumed, 200);
assertEqual(consumed, 1000, 'soma 500, 300 e 200');
assertEqual(hydrationPercent(consumed, 3000), 33.3, 'percentual de 1 litro em 3');
assertEqual(formatHydrationPercent(33.3), '33,3%', 'texto do percentual');
assertEqual(hydrationFill(1500, 3000), 50, 'barra na metade');
assertEqual(hydrationPercent(3500, 3000), 116.7, 'consumo acima da meta');
assertEqual(hydrationFill(3500, 3000), 100, 'barra para em 100');
assertEqual(hydrationPercent(0, 3000), 0, 'zero consumo');
assertEqual(hydrationPercent(500, null), 0, 'sem meta');
assertEqual(hydrationPercent(500, 0), 0, 'meta inválida');
assertEqual(addHydrationIntake(-40, 200), 200, 'consumo não fica negativo');

const saved = { goalMl: 3000, consumedMl: 1000 };
assertEqual(clearedHydration(saved).consumedMl, 0, 'zerar consumo');
assertEqual(clearedHydration(saved).goalMl, 3000, 'zerar preserva a meta');

const tomorrow = hydrationDayView(null, 3000);
assertEqual(tomorrow.goalMl, 3000, 'meta segue no dia seguinte');
assertEqual(tomorrow.consumedMl, 0, 'consumo do dia novo começa em zero');
assertEqual(hydrationDayView({ goalMl: 2000, consumedMl: 400 }, 3000).goalMl, 2000, 'meta do próprio dia prevalece');
assertEqual(hydrationDayView({ goalMl: null, consumedMl: 400 }, 3000).consumedMl, 400, 'histórico do dia não some');

const unseen = { meta: false, excelencia: false };
assertEqual(celebrationForCompletion({ beforeDone: 9, afterDone: 10, beforeTotal: 10, afterTotal: 10, ...unseen }), 'excelencia', 'hábitos em 100');
assertEqual(celebrationForCompletion({ beforeDone: 6, afterDone: 7, beforeTotal: 10, afterTotal: 10, ...unseen }), 'meta', 'hábitos em 70');
assertEqual(celebrationForCompletion({ beforeDone: 4, afterDone: 5, beforeTotal: 10, afterTotal: 10, ...unseen }), null, 'hábitos em 50');

const waterHabit = {
  id: 'water',
  userHabitId: 'water',
  catalogHabitId: 'corpo-hidratacao',
  label: 'Cumprir meta pessoal de hidratação',
  period: 'manha',
  pillar: 'corpo',
  relevance: 'baixa',
  minutes: null,
} as DailyHabit;
const ownWaterHabit = { ...waterHabit, id: 'own', userHabitId: 'own', catalogHabitId: null, label: 'Beber água' };
assertEqual(habitsForScore([waterHabit, ownWaterHabit]).map((habit) => habit.id).join(','), 'own', 'só o hábito oficial de hidratação sai da conta');

console.log('hydration-panel-ok');
