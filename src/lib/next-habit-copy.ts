import { normalizeHabitText } from '@/lib/habit-classify';

export type NextHabitCopy = {
  headline: string;
  question: string;
  detail: string;
};

function has(text: string, words: readonly string[]) {
  return words.some((word) => text.includes(word));
}

function withTime(detail: string, minutes: number | null) {
  if (minutes == null || minutes <= 0) {
    return detail;
  }
  return `${detail} Você reservou ${minutes} min.`;
}

export function nextHabitCopy(label: string, minutes: number | null): NextHabitCopy {
  const text = normalizeHabitText(label);
  const headline = label.trim().toUpperCase();
  if (has(text, ['jiu jitsu', 'jiujitsu', 'bjj', 'kimono'])) {
    return {
      headline,
      question: 'JÁ TREINOU HOJE?',
      detail: 'Faça o seu treino e mantenha a constância no tatame.',
    };
  }
  if (has(text, ['leitur', 'livro']) || text === 'ler' || text.startsWith('ler ')) {
    return {
      headline,
      question: 'JÁ LEU ALGUMA COISA HOJE?',
      detail: withTime('Comece com algumas páginas. O importante é manter a constância.', minutes),
    };
  }
  if (has(text, ['muscul', 'academia', 'treino', 'treinar', 'halter'])) {
    return {
      headline,
      question: 'JÁ TREINOU HOJE?',
      detail: withTime('Reserve um momento para cuidar do seu corpo.', minutes),
    };
  }
  if (has(text, ['estud', 'curso'])) {
    return {
      headline,
      question: 'JÁ ESTUDOU HOJE?',
      detail: withTime('Alguns minutos de foco também fazem diferença.', minutes),
    };
  }
  return {
    headline,
    question: 'JÁ FEZ ESSE HÁBITO HOJE?',
    detail: withTime('Reserve um momento e mantenha a constância.', minutes),
  };
}
