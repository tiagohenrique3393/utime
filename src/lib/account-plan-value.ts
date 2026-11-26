export type AccountPlan = 'unknown' | 'free' | 'premium';

export function accountPlanFromValue(value: unknown): Exclude<AccountPlan, 'unknown'> {
  if (typeof value !== 'string') {
    return 'free';
  }
  return value.trim().toLowerCase() === 'premium' ? 'premium' : 'free';
}

export function isPremiumPlan(value: AccountPlan) {
  return value === 'premium';
}
