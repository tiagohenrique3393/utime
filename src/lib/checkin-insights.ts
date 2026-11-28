import type { ProgressPeriod } from '@/lib/progress-view';

export type InsightSignals = {
  habitPercent: number | null;
  sleepPercent: number | null;
  moodPercent: number | null;
  habitDelta: number | null;
  sleepDelta: number | null;
  moodDelta: number | null;
};

const periodWord: Record<ProgressPeriod, string> = {
  dia: 'dia',
  semana: 'semana',
  mes: 'mês',
  ano: 'ano',
};

/** Mensagem sem prefixo. A UI renderiza `INSIGHT:` em ouro. Sem claims médicos. */
export function progressInsight(signals: InsightSignals, period: ProgressPeriod): string {
  const { habitPercent, sleepPercent, moodPercent, habitDelta, sleepDelta, moodDelta } = signals;
  const label = periodWord[period];

  if (habitPercent == null && sleepPercent == null && moodPercent == null) {
    return period === 'dia'
      ? 'Registre hábitos, sono e humor para ver o ritmo do dia.'
      : `Ainda sem dados suficientes neste ${label}.`;
  }

  if (sleepPercent != null && sleepPercent >= 80 && habitPercent != null && habitPercent >= 70) {
    return period === 'dia'
      ? 'Bom descanso e hábitos firmes. Mantenha o ritmo até o final do dia.'
      : `Ritmo forte e equilibrado na ${label}. Foco em manter a constância.`;
  }
  if (sleepPercent != null && sleepPercent < 50 && habitPercent != null && habitPercent < 60) {
    return 'Sono baixo; priorize descanso para sustentar o ritmo.';
  }
  if (moodDelta != null && moodDelta > 0 && moodPercent != null && moodPercent >= 60) {
    return period === 'dia'
      ? 'Progresso em evolução, com boa tendência no humor. Mantenha o ritmo até o final do dia.'
      : `Humor em alta neste ${label}. Continue observando o padrão.`;
  }
  if (habitDelta != null && habitDelta > 0 && habitPercent != null && habitPercent >= 60) {
    if (period === 'mes') {
      return 'Consistência crescente ao longo do mês. Seu desempenho está acima do período anterior.';
    }
    if (period === 'ano') {
      return 'Evolução positiva e consistente no ano. Continue fortalecendo os hábitos para manter o crescimento.';
    }
    if (period === 'semana') {
      return 'Ritmo forte e equilibrado na semana. Foco em manter a constância nos próximos dias.';
    }
    return 'Progresso em evolução. Mantenha o ritmo até o final do dia.';
  }
  if (moodPercent != null && moodPercent < 40 && habitPercent != null && habitPercent >= 70) {
    return 'Hábitos firmes; cuide do humor com pausas leves.';
  }
  if (sleepDelta != null && sleepDelta > 0) {
    return 'Sono em evolução — mantenha a rotina de descanso.';
  }
  if (habitPercent != null && habitPercent >= 100) {
    return period === 'dia'
      ? 'Excelência nos hábitos. Sustente a constância até o final do dia.'
      : `Excelência nos hábitos neste ${label}. Sustente a constância.`;
  }
  if (habitPercent != null && habitPercent >= 70) {
    return period === 'semana'
      ? 'Ritmo forte e equilibrado na semana. Foco em manter a constância nos próximos dias.'
      : period === 'mes'
        ? 'Consistência crescente ao longo do mês. Mantenha o padrão.'
        : period === 'ano'
          ? 'Evolução positiva e consistente no ano. Continue fortalecendo os hábitos.'
          : 'Progresso em evolução. Mantenha o ritmo até o final do dia.';
  }
  if (habitPercent != null && habitPercent < 40) {
    return 'Comece pelo próximo hábito — um passo por vez.';
  }
  return `Continue registrando; o padrão do ${label} aparece com o tempo.`;
}

export function sleepDetailInsight(sleepPercent: number | null, habitPercent: number | null): string {
  if (sleepPercent == null) {
    return 'Sem registro de sono neste período.';
  }
  if (sleepPercent >= 80 && habitPercent != null && habitPercent >= 70) {
    return 'Bom descanso e hábitos firmes neste período.';
  }
  if (sleepPercent < 50) {
    return 'Sono abaixo da meta. Priorize o descanso.';
  }
  if (sleepPercent >= 70) {
    return 'Sono estável. Mantenha a rotina.';
  }
  return 'Há espaço para melhorar quantidade ou qualidade.';
}

export function moodDetailInsight(moodPercent: number | null, periodLabel?: string): string {
  if (moodPercent == null) {
    return 'Sem registro de humor neste período.';
  }
  if (moodPercent >= 80) {
    return periodLabel ? `Humor elevado (${periodLabel}).` : 'Humor elevado neste período.';
  }
  if (moodPercent >= 60) {
    return 'Humor equilibrado. Continue observando.';
  }
  if (moodPercent < 40) {
    return 'Humor baixo — pausas e conexão ajudam.';
  }
  return 'Humor em construção. Registre os três períodos.';
}
