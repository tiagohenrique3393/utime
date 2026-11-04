import { acknowledgeNextHabit, nextHabitEntryGeneration, resetNextHabitEntry, shouldShowNextHabit } from '@/lib/next-habit-entry';
import { nextHabitCopy } from '@/lib/next-habit-copy';

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${String(expected)}, obtido ${String(actual)}`);
  }
}

const start = nextHabitEntryGeneration();
assertEqual(shouldShowNextHabit('ana'), true, 'primeira abertura');
acknowledgeNextHabit('ana');
assertEqual(shouldShowNextHabit('ana'), false, 'navegação interna não reabre');
assertEqual(shouldShowNextHabit('bia'), true, 'outra conta na mesma abertura');
resetNextHabitEntry();
assertEqual(nextHabitEntryGeneration() > start, true, 'logout abre nova geração');
assertEqual(shouldShowNextHabit('ana'), true, 'novo login mostra de novo');

const jiu = nextHabitCopy('Jiu-jitsu', 60);
assertEqual(jiu.question, 'JÁ TREINOU HOJE?', 'pergunta de jiu-jitsu');
assertEqual(jiu.detail.includes('tatame'), true, 'texto do tatame');
assertEqual(jiu.detail.includes('60 min'), true, 'tempo cadastrado');
const read = nextHabitCopy('Leitura', null);
assertEqual(read.question, 'JÁ LEU ALGUMA COISA HOJE?', 'pergunta de leitura');
assertEqual(nextHabitCopy('Estudar inglês', null).question, 'JÁ ESTUDOU HOJE?', 'pergunta de estudo');

console.log('next-habit-entry-ok');
