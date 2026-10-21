import type { HabitPillar } from '@/lib/habit-catalog';

export type HabitIcon =
  | 'run'
  | 'lotus'
  | 'book'
  | 'brain'
  | 'drop'
  | 'spark'
  | 'utensils'
  | 'moon'
  | 'coffee'
  | 'phone'
  | 'bed'
  | 'sun'
  | 'heart'
  | 'target';

export type HabitClassification = {
  pillar: HabitPillar;
  confident: boolean;
  icon: HabitIcon;
};

const accents: Record<string, string> = {
  á: 'a',
  à: 'a',
  ã: 'a',
  â: 'a',
  é: 'e',
  ê: 'e',
  í: 'i',
  ó: 'o',
  ô: 'o',
  õ: 'o',
  ú: 'u',
  ç: 'c',
};

export function normalizeHabitText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[áàãâéêíóôõúç]/g, (letter) => accents[letter] ?? letter)
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function has(text: string, words: readonly string[]) {
  return words.some((word) => text.includes(word));
}

export function classifyHabit(name: string): HabitClassification {
  const text = normalizeHabitText(name);
  if (!text) {
    return { pillar: 'mente', confident: false, icon: 'target' };
  }
  if (has(text, ['biblia', 'oracao', 'orar', 'reza', 'rezar', 'espiritual', 'deus', 'fe ']) || text === 'fe' || text.startsWith('fe ')) {
    return { pillar: 'espirito', confident: true, icon: text.includes('bibl') || text.includes('leitura') || text.includes('ler ') ? 'book' : 'lotus' };
  }
  if (has(text, ['medit', 'gratidao', 'grato', 'reflexao'])) {
    return { pillar: 'espirito', confident: true, icon: text.includes('grat') ? 'heart' : 'lotus' };
  }
  if (has(text, ['escovar', 'dente', 'banho', 'higiene'])) {
    return { pillar: 'corpo', confident: true, icon: 'spark' };
  }
  if (has(text, ['raciocinio', 'planej', 'prioridad'])) {
    return { pillar: 'mente', confident: true, icon: 'brain' };
  }
  if (has(text, ['muscul', 'academia', 'caminh', 'corrida', 'treino', 'atividade fisica', 'exercicio fisico'])) {
    return { pillar: 'corpo', confident: true, icon: 'run' };
  }
  if (has(text, ['aliment', 'refeicao', 'comida'])) {
    return { pillar: 'corpo', confident: true, icon: 'utensils' };
  }
  if (has(text, ['cafe'])) {
    return { pillar: 'corpo', confident: true, icon: 'coffee' };
  }
  if (has(text, ['dormir', 'sono'])) {
    return { pillar: 'corpo', confident: true, icon: 'moon' };
  }
  if (has(text, ['agua', 'hidrat'])) {
    return { pillar: 'corpo', confident: true, icon: 'drop' };
  }
  if (has(text, ['rede social', 'redes sociais', 'celular'])) {
    return { pillar: 'mente', confident: true, icon: 'phone' };
  }
  if (has(text, ['ingles', 'matematica', 'tecnico', 'estud', 'habilidade', 'curso'])) {
    return { pillar: 'mente', confident: true, icon: text.includes('estud') || text.includes('curso') ? 'brain' : 'book' };
  }
  if (has(text, ['foco', 'trabalho'])) {
    return { pillar: 'mente', confident: true, icon: 'brain' };
  }
  if (has(text, ['arrumar a cama', 'cama', 'quarto'])) {
    return { pillar: 'mente', confident: true, icon: 'bed' };
  }
  if (text === 'leitura' || text === 'ler' || text === 'ler um livro' || text === 'ler livro') {
    return { pillar: 'mente', confident: false, icon: 'book' };
  }
  if (has(text, ['ler ', 'leitura', 'livro'])) {
    return { pillar: 'mente', confident: true, icon: 'book' };
  }
  return { pillar: 'mente', confident: false, icon: 'target' };
}
