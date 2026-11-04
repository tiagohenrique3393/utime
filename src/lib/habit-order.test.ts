import { habitOrderAfterMove, nextPeriod, planHabitMove } from '@/lib/habit-order';

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${expected}, obtido ${actual}`);
  }
}

assertEqual(habitOrderAfterMove(['a', 'b', 'c'], 'a', 2).join(','), 'b,c,a', 'desce para o fim');
assertEqual(habitOrderAfterMove(['a', 'b', 'c'], 'c', 0).join(','), 'c,a,b', 'sobe para o início');
assertEqual(habitOrderAfterMove(['a', 'b', 'c'], 'b', 1).join(','), 'a,b,c', 'mesma posição');
assertEqual(habitOrderAfterMove(['a', 'b'], 'z', 1).join(','), 'a,z,b', 'entra em outro período');
assertEqual(habitOrderAfterMove(['a', 'b'], 'z', 9).join(','), 'a,b,z', 'índice além do fim');
assertEqual(habitOrderAfterMove(['a', 'a'], 'a', 0).join(','), 'a', 'não duplica');
assertEqual(nextPeriod('manha'), 'tarde', 'manhã');
assertEqual(nextPeriod('tarde'), 'noite', 'tarde');
assertEqual(nextPeriod('noite'), 'manha', 'noite');

const duplicated = [
  { id: 'a', period: 'manha' as const, sortOrder: 1, active: true },
  { id: 'b', period: 'manha' as const, sortOrder: 1, active: true },
  { id: 'c', period: 'tarde' as const, sortOrder: 1, active: true },
  { id: 'off', period: 'manha' as const, sortOrder: 9, active: false },
];
const down = planHabitMove(duplicated, 'a', 'manha', 2);
assertEqual(down?.map((item) => item.id).join(',') ?? '', 'b,a', 'desce mesmo com ordem repetida');
assertEqual(down?.map((item) => item.sortOrder).join(',') ?? '', '1000,1001', 'grava posições únicas');
const across = planHabitMove(duplicated, 'a', 'tarde', 1);
assertEqual(across?.map((item) => `${item.id}:${item.period}:${item.sortOrder}`).join('|') ?? '', 'c:tarde:2000|a:tarde:2001', 'muda de período sem duplicar');
assertEqual(String(planHabitMove(duplicated, 'off', 'noite', 0)), 'null', 'hábito inativo não entra');
assertEqual(planHabitMove(duplicated, 'a', 'manha', 0)?.map((item) => item.id).join(',') ?? '', 'a,b', 'sobe para o início do período');

console.log('habit-order-ok');
