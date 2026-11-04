import { dropIndexFromCenters, locateHabitDrop } from '@/lib/habit-drag';

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${expected}, obtido ${actual}`);
  }
}

assertEqual(String(dropIndexFromCenters(0, [10, 30, 50])), '0', 'antes do primeiro');
assertEqual(String(dropIndexFromCenters(20, [10, 30, 50])), '1', 'entre o primeiro e o segundo');
assertEqual(String(dropIndexFromCenters(60, [10, 30, 50])), '3', 'depois do ultimo');

const headers = [
  { period: 'manha' as const, top: 0, bottom: 40 },
  { period: 'tarde' as const, top: 200, bottom: 240 },
];
const rows = [
  { period: 'manha' as const, id: 'a', top: 40, bottom: 80 },
  { period: 'manha' as const, id: 'b', top: 80, bottom: 120 },
  { period: 'manha' as const, id: 'c', top: 120, bottom: 160 },
];
assertEqual(JSON.stringify(locateHabitDrop(50, 'c', headers, rows)), JSON.stringify({ period: 'manha', index: 0 }), 'sobe para o inicio');
assertEqual(JSON.stringify(locateHabitDrop(90, 'c', headers, rows)), JSON.stringify({ period: 'manha', index: 1 }), 'desce uma posicao');
assertEqual(JSON.stringify(locateHabitDrop(220, 'a', headers, rows)), JSON.stringify({ period: 'tarde', index: 0 }), 'periodo recolhido');
assertEqual(String(locateHabitDrop(-20, 'a', headers, rows)), 'null', 'fora da lista');

console.log('habit-drag-ok');
