import type { ProgressPeriod } from '@/lib/progress-view';

export type InsightSignals = {
  habitPercent: number | null;
  sleepPercent: number | null;
  moodPercent: number | null;
  habitDelta: number | null;
  sleepDelta: number | null;
  moodDelta: number | null;
};

/** Insights baseados em regras a partir de dados reais. Sem IA externa. */
export function progressInsight(signals: InsightSignals, period: ProgressPeriod): string {
  const { habitPercent, sleepPercent, moodPercent, habitDelta, sleepDelta, moodDelta } = signals;

  if (habitPercent == null && sleepPercent == null && moodPercent == null) {
    return period === 'dia'
      ? 'INSIGHT: registre hábitos, sono e humor para ver o ritmo do dia.'
      : 'INSIGHT: ainda sem dados suficientes neste período.';
  }

  if (sleepPercent != null && sleepPercent >= 80 && habitPercent != null && habitPercent >= 70) {
    return 'INSIGHT: dormindo bem, seus hábitos sobem.';
  }
  if (sleepPercent != null && sleepPercent < 50 && habitPercent != null && habitPercent < 60) {
    return 'INSIGHT: sono baixo; priorize descanso para sustentar o dia.';
  }
  if (moodDelta != null && moodDelta > 0 && moodPercent != null && moodPercent >= 60) {
    return 'INSIGHT: seu humor melhorou neste período.';
  }
  if (habitDelta != null && habitDelta > 0 && habitPercent != null && habitPercent >= 70) {
    return 'INSIGHT: ritmo forte e equilíbrio em alta.';
  }
  if (moodPercent != null && moodPercent < 40 && habitPercent != null && habitPercent >= 70) {
    return 'INSIGHT: hábitos firmes; cuide do humor com pausas.';
  }
  if (sleepDelta != null && sleepDelta > 0) {
    return 'INSIGHT: sono em evolução — mantenha a rotina.';
  }
  if (habitPercent != null && habitPercent >= 100) {
    return 'INSIGHT: excelência nos hábitos. Sustente a constância.';
  }
  if (habitPercent != null && habitPercent >= 70) {
    return 'INSIGHT: ritmo forte e equilíbrio em alta.';
  }
  if (habitPercent != null && habitPercent < 40) {
    return 'INSIGHT: comece pelo próximo hábito — um passo por vez.';
  }
  return 'INSIGHT: continue registrando; o padrão aparece com o tempo.';
}

export function sleepDetailInsight(sleepPercent: number | null, habitPercent: number | null): string {
  if (sleepPercent == null) {
    return 'INSIGHT: sem registro de sono neste período.';
  }
  if (sleepPercent >= 80 && habitPercent != null && habitPercent >= 70) {
    return 'INSIGHT: dormindo melhor, seus hábitos sobem.';
  }
  if (sleepPercent < 50) {
    return 'INSIGHT: sono abaixo da meta — ajuste horário e qualidade.';
  }
  if (sleepPercent >= 70) {
    return 'INSIGHT: sono estável. Mantenha a rotina.';
  }
  return 'INSIGHT: há espaço para melhorar quantidade ou qualidade.';
}

export function moodDetailInsight(moodPercent: number | null, periodLabel?: string): string {
  if (moodPercent == null) {
    return 'INSIGHT: sem registro de humor neste período.';
  }
  if (moodPercent >= 80) {
    return periodLabel
      ? `INSIGHT: humor elevado${periodLabel ? ` (${periodLabel})` : ''}.`
      : 'INSIGHT: humor elevado neste período.';
  }
  if (moodPercent >= 60) {
    return 'INSIGHT: humor equilibrado. Continue observando.';
  }
  if (moodPercent < 40) {
    return 'INSIGHT: humor baixo — pausas e conexão ajudam.';
  }
  return 'INSIGHT: humor em construção. Registre os três períodos.';
}
