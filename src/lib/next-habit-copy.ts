import { normalizeHabitText } from '@/lib/habit-classify';

export type NextHabitCopy = {
  headline: string;
  question: string;
  detail: string;
};

function has(text: string, words: readonly string[]) {
  return words.some((word) => text.includes(word));
}

export function nextHabitCopy(label: string, _minutes: number | null): NextHabitCopy {
  const text = normalizeHabitText(label);
  const headline = label.trim().toUpperCase();
  const question = 'JÁ FEZ ESSE HÁBITO HOJE?';
  if (has(text, ['jiu jitsu', 'jiujitsu', 'bjj', 'kimono'])) {
    return { headline, question, detail: 'Faça o seu treino e mantenha a constância no tatame.' };
  }
  if (has(text, ['medit', 'respir'])) {
    return { headline, question, detail: 'Conecte-se, respire e mantenha o equilíbrio.' };
  }
  if (has(text, ['leitur', 'livro', 'estud', 'curso']) || text === 'ler' || text.startsWith('ler ')) {
    return { headline, question, detail: 'Estimule o foco e o aprendizado.' };
  }
  if (has(text, ['dente', 'escov', 'banho', 'agua', 'dorm', 'saúde', 'saude'])) {
    return { headline, question, detail: 'Cuide da sua saúde e bem-estar.' };
  }
  return { headline, question, detail: 'Reserve um momento e mantenha a constância.' };
}
