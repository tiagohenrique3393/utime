export type ProgressBand = 'red' | 'yellow' | 'green' | 'gold';

export const progressBandColor: Record<ProgressBand, string> = {
  red: '#E24B4B',
  yellow: '#F5C518',
  green: '#3DDC6A',
  gold: '#F6C453',
};

// Limites sobre o percentual real. A apresentação é que arredonda o texto.
export function getProgressColor(progress: number): ProgressBand {
  if (!Number.isFinite(progress) || progress <= 50) {
    return 'red';
  }
  if (progress < 70) {
    return 'yellow';
  }
  if (progress < 100) {
    return 'green';
  }
  return 'gold';
}
