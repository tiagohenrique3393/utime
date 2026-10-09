import type { HabitPeriod, HabitPillar, HabitRelevance } from '@/lib/habit-catalog';

export type SuggestedHabit = {
  id: string;
  label: string;
  period: HabitPeriod;
  pillar: HabitPillar;
  relevance: HabitRelevance;
};

export const HYDRATION_HABIT_ID = 'corpo-hidratacao';

export const suggestedHabits: readonly SuggestedHabit[] = [
  {
    id: 'corpo-atividade',
    label: 'Praticar atividade física',
    period: 'tarde',
    pillar: 'corpo',
    relevance: 'alta',
  },
  {
    id: 'corpo-refeicao',
    label: 'Preparar uma refeição equilibrada',
    period: 'manha',
    pillar: 'corpo',
    relevance: 'media',
  },
  {
    id: HYDRATION_HABIT_ID,
    label: 'Cumprir meta pessoal de hidratação',
    period: 'manha',
    pillar: 'corpo',
    relevance: 'baixa',
  },
  {
    id: 'corpo-higiene',
    label: 'Realizar cuidados de higiene bucal',
    period: 'manha',
    pillar: 'corpo',
    relevance: 'baixa',
  },
  {
    id: 'mente-estudo',
    label: 'Estudar ou desenvolver uma habilidade',
    period: 'manha',
    pillar: 'mente',
    relevance: 'alta',
  },
  {
    id: 'mente-leitura',
    label: 'Ler',
    period: 'noite',
    pillar: 'mente',
    relevance: 'media',
  },
  {
    id: 'mente-prioridades',
    label: 'Definir as prioridades do dia',
    period: 'manha',
    pillar: 'mente',
    relevance: 'baixa',
  },
  {
    id: 'espirito-meditacao',
    label: 'Meditar ou refletir',
    period: 'manha',
    pillar: 'espirito',
    relevance: 'media',
  },
  {
    id: 'espirito-atencao',
    label: 'Dedicar atenção a alguém importante',
    period: 'tarde',
    pillar: 'espirito',
    relevance: 'media',
  },
  {
    id: 'espirito-gratidao',
    label: 'Registrar algo pelo qual é grato',
    period: 'noite',
    pillar: 'espirito',
    relevance: 'baixa',
  },
];

export function suggestedHabitById(id: string) {
  return suggestedHabits.find((habit) => habit.id === id) ?? null;
}
