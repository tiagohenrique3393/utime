export type ProgressBand = 'red' | 'green' | 'gold';

export const progressBandColor: Record<ProgressBand, string> = {
  red: '#FF3B4D',
  green: '#39FF73',
  gold: '#FFC94A',
};

export const progressBandGlow: Record<ProgressBand, string> = {
  red: 'rgba(255, 59, 77, 0.45)',
  green: 'rgba(57, 255, 115, 0.4)',
  gold: 'rgba(255, 201, 74, 0.85)',
};

// A cor usa o percentual real. 99,99 continua verde; o dourado só começa em 100.
export function getProgressColor(progress: number): ProgressBand {
  if (!Number.isFinite(progress) || progress < 70) {
    return 'red';
  }
  if (progress < 100) {
    return 'green';
  }
  return 'gold';
}

export function showsExcellence(progress: number) {
  return getProgressColor(progress) === 'gold';
}
