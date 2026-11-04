import { habitOrderAfterMove, nextPeriod } from '@/lib/habit-order';

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

console.log('habit-order-ok');
