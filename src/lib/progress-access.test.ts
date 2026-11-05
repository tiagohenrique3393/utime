import type { AccountPlan } from '@/lib/account-plan-value';
import { progressPeriodOnPress, visibleProgressPeriod } from '@/lib/progress-access';
import type { ProgressPeriod } from '@/lib/progress-view';

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${String(expected)}, obtido ${String(actual)}`);
  }
}

const plans: AccountPlan[] = ['free', 'unknown'];
const locked: ProgressPeriod[] = ['semana', 'mes', 'ano'];

for (const plan of plans) {
  assertEqual(visibleProgressPeriod(plan, 'semana'), 'dia', `${plan} permanece no dia`);
  for (const period of locked) {
    assertEqual(progressPeriodOnPress(plan, period), null, `${plan} ignora ${period}`);
  }
  assertEqual(progressPeriodOnPress(plan, 'dia'), 'dia', `${plan} mantém o dia`);
}

for (const period of ['dia', 'semana', 'mes', 'ano'] as const) {
  assertEqual(visibleProgressPeriod('premium', period), period, `premium vê ${period}`);
  assertEqual(progressPeriodOnPress('premium', period), period, `premium abre ${period}`);
}

console.log('progress-access ok');
