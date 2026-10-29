import { getProgressColor, showsExcellence, type ProgressBand } from '@/lib/progress-color';

export type RingMetrics = {
  band: ProgressBand;
  circumference: number;
  length: number;
  star: boolean;
};

export function ringMetrics(percent: number, radius: number): RingMetrics {
  const finite = Number.isFinite(percent) ? percent : 0;
  const band = getProgressColor(finite);
  const clamped = Math.min(100, Math.max(0, finite));
  const circumference = 2 * Math.PI * radius;
  const length = clamped <= 0 ? 0 : circumference * (clamped / 100);
  return {
    band,
    circumference,
    length,
    star: showsExcellence(finite),
  };
}
