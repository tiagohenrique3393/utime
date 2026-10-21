import { keepsStreak, perfectDay } from '@/lib/constancy';

export type CelebrationKind = 'meta' | 'excelencia';

export type SeenCelebrations = {
  meta: boolean;
  excelencia: boolean;
};

export type CelebrationView = {
  visible: CelebrationKind | null;
  seen: SeenCelebrations;
};

export type CompletionSnapshot = {
  beforeDone: number;
  afterDone: number;
  beforeTotal: number;
  afterTotal: number;
};

export function initialCelebrationView(): CelebrationView {
  return { visible: null, seen: { meta: false, excelencia: false } };
}

export function celebrationStorageKey(userId: string, day: string) {
  return `utime-day-celebration:${userId}:${day}`;
}

export function celebrationForCompletion(input: CompletionSnapshot & SeenCelebrations): CelebrationKind | null {
  const { beforeDone, afterDone, beforeTotal, afterTotal, meta, excelencia } = input;
  if (beforeTotal <= 0 || beforeTotal !== afterTotal || afterDone <= beforeDone) {
    return null;
  }
  const total = beforeTotal;
  const done = Math.min(afterDone, total);
  const before = Math.max(0, Math.min(beforeDone, total));
  if (perfectDay(done, total) && !perfectDay(before, total)) {
    return excelencia ? null : 'excelencia';
  }
  if (keepsStreak(done, total) && !keepsStreak(before, total)) {
    return meta ? null : 'meta';
  }
  return null;
}

export function noteCelebrationsLoaded(view: CelebrationView, seen: SeenCelebrations): CelebrationView {
  return {
    visible: view.visible,
    seen: {
      meta: view.seen.meta || seen.meta,
      excelencia: view.seen.excelencia || seen.excelencia,
    },
  };
}

export function openCelebration(view: CelebrationView, input: CompletionSnapshot): { view: CelebrationView; shown: CelebrationKind | null } {
  const kind = celebrationForCompletion({ ...input, ...view.seen });
  if (!kind || view.visible) {
    return { view, shown: null };
  }
  return {
    shown: kind,
    view: {
      visible: kind,
      seen: {
        meta: view.seen.meta || kind === 'meta',
        excelencia: view.seen.excelencia || kind === 'excelencia',
      },
    },
  };
}

export function dismissCelebration(view: CelebrationView): CelebrationView {
  if (!view.visible) {
    return view;
  }
  return { ...view, visible: null };
}
