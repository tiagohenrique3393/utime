export type ReminderArt = 'mantime' | 'womantime' | 'mente' | 'espirito';

export function reminderArt(pillar: string | null | undefined, journey: string | null | undefined): ReminderArt | null {
  if (pillar === 'mente') {
    return 'mente';
  }
  if (pillar === 'espirito') {
    return 'espirito';
  }
  if (pillar !== 'corpo') {
    return null;
  }
  if (journey === 'womantime') {
    return 'womantime';
  }
  if (journey === 'metime') {
    return 'mantime';
  }
  return null;
}
