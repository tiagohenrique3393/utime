import { habitAcceptsDuration, parseHabitMinutes, suggestedMinutes } from '@/lib/habit-visual';

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${String(expected)}, obtido ${String(actual)}`);
  }
}

assertEqual(habitAcceptsDuration('Escovar os dentes'), false, 'dentes');
assertEqual(habitAcceptsDuration('Tomar banho'), false, 'banho');
assertEqual(habitAcceptsDuration('Beber água'), false, 'agua');
assertEqual(habitAcceptsDuration('Beber 1 L de água', 'manha-agua'), false, 'catalogo agua');
assertEqual(habitAcceptsDuration('Tomar vitaminas'), false, 'vitaminas');
assertEqual(habitAcceptsDuration('Praticar gratidão'), false, 'gratidao');
assertEqual(habitAcceptsDuration('Inventar um ritmo novo'), false, 'desconhecido');
assertEqual(habitAcceptsDuration('Musculação'), true, 'musculacao');
assertEqual(habitAcceptsDuration('Leitura'), true, 'leitura');
assertEqual(habitAcceptsDuration('Estudar inglês'), true, 'ingles');
assertEqual(habitAcceptsDuration('Meditar'), true, 'meditar');
assertEqual(habitAcceptsDuration('Tomar café'), true, 'cafe');
assertEqual(suggestedMinutes('Beber água'), null, 'agua sem sugestao');
assertEqual(suggestedMinutes('Escovar os dentes'), null, 'dentes sem sugestao');
assertEqual(suggestedMinutes('Musculação'), 30, 'musculacao 30');

const empty = parseHabitMinutes('  ');
assertEqual(empty.ok, false, 'vazio');
const letters = parseHabitMinutes('10 min');
assertEqual(letters.ok, false, 'texto');
const high = parseHabitMinutes('1441');
assertEqual(high.ok, false, 'acima');
const ok = parseHabitMinutes('45');
assertEqual(ok.ok, true, '45 ok');
if (ok.ok) {
  assertEqual(ok.minutes, 45, '45');
}
const zero = parseHabitMinutes('0');
assertEqual(zero.ok, true, 'zero ok');

console.log('habit-visual-ok');
