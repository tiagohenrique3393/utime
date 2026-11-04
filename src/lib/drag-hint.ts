export type DragHintStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export function dragLearnedKey(userId: string) {
  return `utime.drag-learned.${userId}`;
}

export function dragHintVisible(input: { learned: boolean; expanded: boolean; dismissed: boolean }) {
  return input.expanded && !input.learned && !input.dismissed;
}

export function readDragLearned(userId: string | null, storage: DragHintStorage | null) {
  if (!userId || !storage) {
    return false;
  }
  return storage.getItem(dragLearnedKey(userId)) === '1';
}

export function writeDragLearned(userId: string | null, storage: DragHintStorage | null) {
  if (!userId || !storage) {
    return;
  }
  storage.setItem(dragLearnedKey(userId), '1');
}
