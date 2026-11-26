import { accountPlanFromValue } from '@/lib/account-plan-value';
import { progressPeriodOnPress, visibleProgressPeriod } from '@/lib/progress-access';

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${String(expected)}, obtido ${String(actual)}`);
  }
}

// Garante o contrato que a UI usa depois da RPC/tabela.
const premium = accountPlanFromValue('premium');
assertEqual(premium, 'premium', 'rpc premium');
assertEqual(visibleProgressPeriod(premium, 'semana'), 'semana', 'semana liberada');
assertEqual(visibleProgressPeriod(premium, 'mes'), 'mes', 'mes liberado');
assertEqual(visibleProgressPeriod(premium, 'ano'), 'ano', 'ano liberado');
assertEqual(progressPeriodOnPress(premium, 'semana'), 'semana', 'toque semana');

const free = accountPlanFromValue('free');
assertEqual(visibleProgressPeriod(free, 'semana'), 'dia', 'gratuito fica no dia');
assertEqual(progressPeriodOnPress(free, 'mes'), null, 'gratuito ignora mês');

console.log('account-plan-load ok');
