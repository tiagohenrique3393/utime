import { dragHintVisible, dragLearnedKey, readDragLearned, writeDragLearned } from '@/lib/drag-hint';

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${expected}, obtido ${actual}`);
  }
}

assertEqual(String(dragHintVisible({ learned: false, expanded: true, dismissed: false })), 'true', 'primeira abertura');
assertEqual(String(dragHintVisible({ learned: false, expanded: false, dismissed: false })), 'false', 'periodo fechado');
assertEqual(String(dragHintVisible({ learned: false, expanded: true, dismissed: true })), 'false', 'toque esconde');
assertEqual(String(dragHintVisible({ learned: true, expanded: true, dismissed: false })), 'false', 'depois do arraste');

const memory = new Map<string, string>();
const storage = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memory.set(key, value);
  },
};
assertEqual(String(readDragLearned('ana', storage)), 'false', 'ainda nao aprendeu');
writeDragLearned('ana', storage);
assertEqual(storage.getItem(dragLearnedKey('ana')) ?? '', '1', 'grava na conta');
assertEqual(String(readDragLearned('bia', storage)), 'false', 'outra conta continua vendo');
assertEqual(String(readDragLearned(null, storage)), 'false', 'sem conta nao grava');

console.log('drag-hint-ok');
