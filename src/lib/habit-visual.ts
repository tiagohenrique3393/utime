import type { HabitPeriod, HabitPillar } from '@/lib/habit-catalog';
import { classifyHabit, normalizeHabitText, type HabitIcon } from '@/lib/habit-classify';

export const pillarTone: Record<HabitPillar, string> = {
  corpo: '#3DDC97',
  mente: '#E8C88E',
  espirito: '#6EB6F2',
};

export const periodCopy: Record<HabitPeriod, { title: string; subtitle: string }> = {
  manha: { title: 'Manhã', subtitle: 'Energia e foco' },
  tarde: { title: 'Tarde', subtitle: 'Produtividade' },
  noite: { title: 'Noite', subtitle: 'Recuperação' },
};

const timedMinutes: { words: readonly string[]; minutes: number }[] = [
  { words: ['atividade', 'muscul', 'caminh', 'corrida', 'treino', 'academia'], minutes: 30 },
  { words: ['estud', 'ingles', 'matematica', 'curso'], minutes: 45 },
  { words: ['leitur', 'livro', 'ler'], minutes: 20 },
  { words: ['medit', 'orar', 'oracao', 'reza'], minutes: 10 },
  { words: ['cafe'], minutes: 10 },
  { words: ['planej', 'prioridad'], minutes: 10 },
  { words: ['refeic', 'aliment'], minutes: 30 },
];

const timeless = ['escovar', 'dente', 'banho', 'higiene', 'arrumar', 'cama', 'gratidao', 'grato', 'quarto', 'agua', 'hidrat', 'vitamina'];

export function suggestedMinutes(label: string, catalogHabitId?: string | null) {
  const text = normalizeHabitText(`${catalogHabitId ?? ''} ${label}`);
  if (timeless.some((word) => text.includes(word))) {
    return null;
  }
  return timedMinutes.find((item) => item.words.some((word) => text.includes(word)))?.minutes ?? null;
}

export function habitAcceptsDuration(label: string, catalogHabitId?: string | null) {
  return suggestedMinutes(label, catalogHabitId) != null;
}

export function parseHabitMinutes(value: string): { ok: true; minutes: number } | { ok: false; message: string } {
  const trimmed = value.trim();
  if (!/^\d{1,4}$/.test(trimmed)) {
    return { ok: false, message: 'Informe a duração em minutos.' };
  }
  const minutes = Number(trimmed);
  if (minutes > 1440) {
    return { ok: false, message: 'Informe os minutos com um número de 0 a 1440.' };
  }
  return { ok: true, minutes };
}

export function habitIconFor(label: string, catalogHabitId?: string | null): HabitIcon {
  const text = normalizeHabitText(`${catalogHabitId ?? ''} ${label}`);
  if (text.includes('hidrat') || text.includes('agua')) {
    return 'drop';
  }
  if (text.includes('atencao') || text.includes('importante')) {
    return 'heart';
  }
  return classifyHabit(label).icon;
}

export function libraryNote(label: string) {
  const text = normalizeHabitText(label);
  if (text.includes('atividade') || text.includes('muscul')) {
    return { detail: 'Academia, caminhada, luta, esporte.', range: '10–90 MIN' };
  }
  if (text.includes('medit') || text.includes('orar') || text.includes('oracao')) {
    return { detail: 'Conexão e equilíbrio mental.', range: '5–30 MIN' };
  }
  if (text.includes('leitur') || text.includes(' ler') || text === 'ler' || text.includes('livro')) {
    return { detail: 'Livros, artigos, desenvolvimento.', range: '10–60 MIN' };
  }
  if (text.includes('estud')) {
    return { detail: 'Cursos, habilidades, aprendizado.', range: '30–120 MIN' };
  }
  if (text.includes('refeic') || text.includes('aliment')) {
    return { detail: 'Alimentação consciente.', range: null };
  }
  if (text.includes('hidrat') || text.includes('agua')) {
    return { detail: 'Beber água ao longo do dia.', range: null };
  }
  if (text.includes('higiene') || text.includes('dente') || text.includes('banho')) {
    return { detail: 'Cuidados diários.', range: null };
  }
  if (text.includes('grat')) {
    return { detail: 'Reconhecimento e positividade.', range: null };
  }
  if (text.includes('planej') || text.includes('prioridad')) {
    return { detail: 'Organização e foco.', range: '10–30 MIN' };
  }
  if (text.includes('cafe')) {
    return { detail: 'Energia e foco.', range: '5–20 MIN' };
  }
  if (text.includes('dormir') || text.includes('sono')) {
    return { detail: 'Qualidade do sono.', range: '420–540 MIN' };
  }
  if (text.includes('rede')) {
    return { detail: 'Menos distrações, mais foco.', range: '10–60 MIN' };
  }
  if (text.includes('atencao')) {
    return { detail: 'Presença com quem importa.', range: '10–40 MIN' };
  }
  return { detail: 'Inclua na rotina do período escolhido.', range: null };
}

export const extraHabitTemplates: readonly { label: string; pillar: HabitPillar; icon: HabitIcon }[] = [
  { label: 'Tomar café', pillar: 'corpo', icon: 'coffee' },
  { label: 'Dormir bem', pillar: 'corpo', icon: 'moon' },
  { label: 'Reduzir redes sociais', pillar: 'mente', icon: 'phone' },
];
