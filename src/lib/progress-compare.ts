/** Comparações relativas; SEM COMPARAÇÃO quando não há base suficiente. */

export type CompareResult =
  | { kind: 'delta'; delta: number; label: string }
  | { kind: 'none'; label: 'SEM COMPARAÇÃO' };

export function relativePercentDelta(current: number | null, previous: number | null): CompareResult {
  if (current == null || previous == null || !Number.isFinite(current) || !Number.isFinite(previous)) {
    return { kind: 'none', label: 'SEM COMPARAÇÃO' };
  }
  const delta = Math.round((current - previous) * 100) / 100;
  const abs = Math.abs(delta);
  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: Number.isInteger(abs) ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(abs);
  if (delta > 0) {
    return { kind: 'delta', delta, label: `↗ +${formatted}%` };
  }
  if (delta < 0) {
    return { kind: 'delta', delta, label: `↘ −${formatted}%` };
  }
  return { kind: 'delta', delta: 0, label: '→ 0%' };
}

export function compareVsLabel(period: 'dia' | 'semana' | 'mes' | 'ano', result: CompareResult) {
  if (result.kind === 'none') {
    return result.label;
  }
  const suffix =
    period === 'dia' ? 'vs. ontem' : period === 'semana' ? 'vs. semana ant.' : period === 'mes' ? 'vs. mês ant.' : 'vs. ano ant.';
  return `${result.label} ${suffix}`;
}
