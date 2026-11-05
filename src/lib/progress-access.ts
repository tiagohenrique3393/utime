import type { AccountPlan } from '@/lib/account-plan-value';
import type { ProgressPeriod } from '@/lib/progress-view';

export function visibleProgressPeriod(plan: AccountPlan, selected: ProgressPeriod): ProgressPeriod {
  return plan === 'premium' ? selected : 'dia';
}

export function progressPeriodOnPress(plan: AccountPlan, pressed: ProgressPeriod): ProgressPeriod | null {
  if (plan !== 'premium' && pressed !== 'dia') {
    return null;
  }
  return plan === 'premium' ? pressed : 'dia';
}
