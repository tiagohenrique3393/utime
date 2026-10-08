export type ProgressBand = 'red' | 'yellow' | 'green';

export function getProgressColor(progress: number): ProgressBand {
  if (progress < 50) {
    return 'red';
  }
  if (progress < 70) {
    return 'yellow';
  }
  return 'green';
}
