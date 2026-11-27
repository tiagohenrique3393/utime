import type { MoodPeriod } from '@/lib/mood-score';

export type CheckinKind = 'next_habit' | 'sleep' | 'mood';

export type CheckinPromptStatus = 'presented' | 'answered' | 'dismissed';

export type CheckinStep =
  | { kind: 'next_habit' }
  | { kind: 'sleep' }
  | { kind: 'mood'; period: MoodPeriod };

/**
 * Orquestra o fluxo no open/reopen: hábito → sono → humor do período atual.
 * Nunca empilha; devolve o próximo passo elegível ou null.
 */
export function nextCheckinStep(options: {
  habitEligible: boolean;
  sleepEligible: boolean;
  moodEligible: boolean;
  moodPeriod: MoodPeriod;
}): CheckinStep | null {
  if (options.habitEligible) {
    return { kind: 'next_habit' };
  }
  if (options.sleepEligible) {
    return { kind: 'sleep' };
  }
  if (options.moodEligible) {
    return { kind: 'mood', period: options.moodPeriod };
  }
  return null;
}

export function checkinPromptKey(kind: CheckinKind, localDate: string, period: MoodPeriod | null = null) {
  if (kind === 'mood' && period) {
    return `${kind}:${localDate}:${period}`;
  }
  return `${kind}:${localDate}`;
}
