import { accountPlanFromValue, isPremiumPlan } from '@/lib/account-plan-value';

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${String(expected)}, obtido ${String(actual)}`);
  }
}

assertEqual(accountPlanFromValue('premium'), 'premium', 'premium');
assertEqual(accountPlanFromValue('Premium'), 'premium', 'caixa diferente');
assertEqual(accountPlanFromValue(' PREMIUM '), 'premium', 'espaços');
assertEqual(accountPlanFromValue('free'), 'free', 'gratuito');
assertEqual(accountPlanFromValue(null), 'free', 'ausente');
assertEqual(accountPlanFromValue(undefined), 'free', 'indefinido');
assertEqual(isPremiumPlan('premium'), true, 'acesso premium');
assertEqual(isPremiumPlan('free'), false, 'acesso gratuito');
assertEqual(isPremiumPlan('unknown'), false, 'plano ainda não confirmado');

console.log('account-plan ok');
