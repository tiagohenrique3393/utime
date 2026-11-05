export type AccountPlan = 'unknown' | 'free' | 'premium';

export function accountPlanFromValue(value: unknown): Exclude<AccountPlan, 'unknown'> {
  return value === 'premium' ? 'premium' : 'free';
}

export function isPremiumPlan(value: AccountPlan) {
  return value === 'premium';
}
