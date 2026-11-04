import { normalizeHabitText } from '@/lib/habit-classify';

export type HabitSceneId =
  | 'kimono'
  | 'meal'
  | 'book'
  | 'dumbbell'
  | 'run'
  | 'meditate'
  | 'study'
  | 'bed'
  | 'water'
  | 'teeth'
  | 'coffee'
  | 'shower'
  | 'fallback';

const rules: { id: HabitSceneId; words: readonly string[] }[] = [
  { id: 'kimono', words: ['jiu jitsu', 'jiujitsu', 'bjj', 'kimono', 'judo', 'karate'] },
  { id: 'teeth', words: ['escovar', 'dente', 'dentes'] },
  { id: 'shower', words: ['banho', 'ducha', 'chuveiro'] },
  { id: 'coffee', words: ['cafe'] },
  { id: 'water', words: ['agua', 'hidrat', 'beber'] },
  { id: 'meal', words: ['almoc', 'jantar', 'janta', 'refeic', 'comida', 'prato', 'aliment'] },
  { id: 'run', words: ['corrida', 'correr', 'caminh'] },
  { id: 'dumbbell', words: ['academia', 'muscul', 'halter', 'treino', 'treinar', 'exercicio'] },
  { id: 'meditate', words: ['medit', 'oracao', 'orar', 'reza', 'rezar'] },
  { id: 'study', words: ['estud', 'caderno', 'curso', 'licao'] },
  { id: 'book', words: ['leitura', 'livro', 'ler'] },
  { id: 'bed', words: ['dormir', 'sono', 'cama', 'travesseiro'] },
];

function matches(text: string, word: string) {
  if (word.includes(' ')) {
    return text.includes(word);
  }
  return text.split(' ').some((token) => token === word || token.startsWith(word));
}

export function habitSceneId(label: string): HabitSceneId {
  const text = normalizeHabitText(label);
  if (!text) {
    return 'fallback';
  }
  for (const rule of rules) {
    if (rule.words.some((word) => matches(text, word))) {
      return rule.id;
    }
  }
  return 'fallback';
}

