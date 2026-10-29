import { formatDailyPercent, todayKey } from '@/lib/habit-day';
import { greetingParts, homeDateParts } from '@/lib/home-copy';
import { formatHydrationAmount } from '@/lib/hydration-volume';
import { nextScheduledHabit, type ScheduledHabit } from '@/lib/next-habit';
import { getProgressColor } from '@/lib/progress-color';
import { weeklyPhrase, weeklyPhraseIndex, weeklyPhrases } from '@/lib/weekly-phrase';

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${String(expected)}, obtido ${String(actual)}`);
  }
}

const limits: { value: number; band: ReturnType<typeof getProgressColor> }[] = [
  { value: 0, band: 'red' },
  { value: 50, band: 'red' },
  { value: 50.01, band: 'yellow' },
  { value: 51, band: 'yellow' },
  { value: 69, band: 'yellow' },
  { value: 69.99, band: 'yellow' },
  { value: 70, band: 'green' },
  { value: 99, band: 'green' },
  { value: 99.99, band: 'green' },
  { value: 100, band: 'gold' },
];

for (const limit of limits) {
  assertEqual(getProgressColor(limit.value), limit.band, `cor em ${limit.value}`);
}
assertEqual(getProgressColor(50.5), 'yellow', 'cor usa o valor real');
assertEqual(formatDailyPercent(50.5), '50,50%', 'apresentação separada da cor');

const routine: ScheduledHabit[] = [
  { id: 'tarde', label: 'Leitura', period: 'tarde', minutes: 20, done: false },
  { id: 'manha-2', label: 'Café', period: 'manha', minutes: 10, done: false },
  { id: 'manha-1', label: 'Atividade física', period: 'manha', minutes: 30, done: false },
  { id: 'noite', label: 'Oração', period: 'noite', minutes: null, done: false },
];

assertEqual(nextScheduledHabit(routine)?.id, 'manha-2', 'manhã vem antes e preserva a ordem da lista');
assertEqual(nextScheduledHabit(routine.map((habit) => habit.id === 'manha-2' ? { ...habit, done: true } : habit))?.id, 'manha-1', 'o seguinte da manhã');
assertEqual(
  nextScheduledHabit(routine.map((habit) => (habit.period === 'manha' ? { ...habit, done: true } : habit)))?.id,
  'tarde',
  'tarde depois da manhã',
);
assertEqual(nextScheduledHabit(routine.map((habit) => ({ ...habit, done: true }))), null, 'nada pendente');
assertEqual(nextScheduledHabit([]), null, 'sem hábitos');

assertEqual(weeklyPhrases.length, 104, 'ciclo de 104 frases');
assertEqual(new Set(weeklyPhrases).size, 104, 'frases únicas');
assertEqual(weeklyPhrase('2026-10-26'), weeklyPhrase('2026-11-01'), 'mesma frase de segunda a domingo');
assertEqual(weeklyPhrase('2026-10-25') === weeklyPhrase('2026-10-26'), false, 'vira na segunda');
assertEqual(weeklyPhraseIndex('2026-10-26'), (weeklyPhraseIndex('2024-01-01') + 147) % 104, 'índice determinístico');
const firstMonday = '2024-01-01';
const week104 = '2025-12-29';
assertEqual(weeklyPhrase(firstMonday), weeklyPhrase(week104), 'o ciclo recomeça na semana 104');
assertEqual(
  weeklyPhrase(todayKey(new Date('2026-10-26T02:59:00.000Z'))) === weeklyPhrase(todayKey(new Date('2026-10-26T03:00:00.000Z'))),
  false,
  'meia-noite de Brasília',
);

assertEqual(greetingParts(new Date('2026-10-28T14:59:00.000Z'), 'Tiago Souza').hello, 'Bom dia', 'antes do meio-dia');
assertEqual(greetingParts(new Date('2026-10-28T15:00:00.000Z'), 'Tiago Souza').hello, 'Boa tarde', 'meio-dia');
assertEqual(greetingParts(new Date('2026-10-28T20:59:00.000Z'), 'Tiago Souza').hello, 'Boa tarde', 'antes das 18h');
assertEqual(greetingParts(new Date('2026-10-28T21:00:00.000Z'), 'Tiago Souza').name, 'Tiago', 'primeiro nome');
assertEqual(greetingParts(new Date('2026-10-28T21:00:00.000Z'), 'Tiago Souza').hello, 'Boa noite', '18h');
assertEqual(homeDateParts('2026-10-28').dayMonth, '28 DE OUTUBRO', 'data');
assertEqual(homeDateParts('2026-10-28').weekday, 'QUARTA-FEIRA', 'dia da semana');

assertEqual(formatHydrationAmount(0), '0,0 L', 'zero');
assertEqual(formatHydrationAmount(3000), '3,0 L', 'meta em litros');
assertEqual(formatHydrationAmount(250), '0,25 L', '250 ml');

console.log('home-today-ok');
