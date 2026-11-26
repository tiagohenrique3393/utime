function planFromRpcData(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }
  if (value && typeof value === 'object' && 'utime_my_plan' in value) {
    const nested = (value as { utime_my_plan?: unknown }).utime_my_plan;
    return typeof nested === 'string' ? nested : null;
  }
  return null;
}

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${String(expected)}, obtido ${String(actual)}`);
  }
}

assertEqual(planFromRpcData('premium'), 'premium', 'scalar');
assertEqual(planFromRpcData('free'), 'free', 'scalar free');
assertEqual(planFromRpcData({ utime_my_plan: 'premium' }), 'premium', 'wrapped');
assertEqual(planFromRpcData(null), null, 'null');
assertEqual(planFromRpcData(1), null, 'número');

console.log('account-plan-rpc ok');
