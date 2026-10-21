import {
  celebrationForCompletion,
  celebrationStorageKey,
  dismissCelebration,
  initialCelebrationView,
  noteCelebrationsLoaded,
  openCelebration,
  type SeenCelebrations,
} from '@/lib/day-celebration';

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${String(expected)}, obtido ${String(actual)}`);
  }
}

const unseen: SeenCelebrations = { meta: false, excelencia: false };
const seenMeta: SeenCelebrations = { meta: true, excelencia: false };
const seenBoth: SeenCelebrations = { meta: true, excelencia: true };

assertEqual(celebrationForCompletion({ beforeDone: 8, afterDone: 9, beforeTotal: 13, afterTotal: 13, ...unseen }), null, 'abaixo de 70');
assertEqual(celebrationForCompletion({ beforeDone: 9, afterDone: 10, beforeTotal: 13, afterTotal: 13, ...unseen }), 'meta', 'cruza 70 em 13');
assertEqual(celebrationForCompletion({ beforeDone: 6, afterDone: 7, beforeTotal: 10, afterTotal: 10, ...unseen }), 'meta', 'cruza 70 em 10');
assertEqual(celebrationForCompletion({ beforeDone: 12, afterDone: 13, beforeTotal: 13, afterTotal: 13, ...seenMeta }), 'excelencia', 'chega a 100');
assertEqual(celebrationForCompletion({ beforeDone: 6, afterDone: 10, beforeTotal: 10, afterTotal: 10, ...unseen }), 'excelencia', 'salta para 100');
assertEqual(celebrationForCompletion({ beforeDone: 0, afterDone: 1, beforeTotal: 1, afterTotal: 1, ...unseen }), 'excelencia', 'unico habito');
assertEqual(celebrationForCompletion({ beforeDone: 9, afterDone: 10, beforeTotal: 13, afterTotal: 13, ...seenMeta }), null, '70 ja vista');
assertEqual(celebrationForCompletion({ beforeDone: 12, afterDone: 13, beforeTotal: 13, afterTotal: 13, ...seenBoth }), null, '100 ja vista');
assertEqual(celebrationForCompletion({ beforeDone: 10, afterDone: 9, beforeTotal: 13, afterTotal: 13, ...unseen }), null, 'desmarcar');
assertEqual(celebrationForCompletion({ beforeDone: 0, afterDone: 1, beforeTotal: 0, afterTotal: 0, ...unseen }), null, 'sem habitos');
assertEqual(celebrationForCompletion({ beforeDone: 6, afterDone: 7, beforeTotal: 10, afterTotal: 11, ...unseen }), null, 'rotina mudou');
assertEqual(celebrationForCompletion({ beforeDone: 10, afterDone: 10, beforeTotal: 13, afterTotal: 13, ...unseen }), null, 'sem conclusao nova');

let view = initialCelebrationView();
const crossed = openCelebration(view, { beforeDone: 9, afterDone: 10, beforeTotal: 13, afterTotal: 13 });
assertEqual(crossed.shown, 'meta', 'abre meta');
assertEqual(crossed.view.visible, 'meta', 'meta visivel');
const closedContinue = dismissCelebration(crossed.view);
assertEqual(closedContinue.visible, null, 'continuar fecha');
assertEqual(closedContinue.seen.meta, true, 'continuar preserva o registro');
const closedDismiss = dismissCelebration(crossed.view);
assertEqual(closedDismiss.visible, null, 'fechar pelo x');
assertEqual(closedDismiss.seen.meta, true, 'x preserva o registro');

const reloaded = noteCelebrationsLoaded(initialCelebrationView(), { meta: true, excelencia: false });
assertEqual(reloaded.visible, null, 'recarregar nao reabre');
const repeated = openCelebration(reloaded, { beforeDone: 8, afterDone: 10, beforeTotal: 13, afterTotal: 13 });
assertEqual(repeated.shown, null, 'remarcar nao repete 70');
const excellence = openCelebration(reloaded, { beforeDone: 12, afterDone: 13, beforeTotal: 13, afterTotal: 13 });
assertEqual(excellence.shown, 'excelencia', '100 depois de 70');
const excellenceAgain = openCelebration(excellence.view, { beforeDone: 12, afterDone: 13, beforeTotal: 13, afterTotal: 13 });
assertEqual(excellenceAgain.shown, null, '100 nao sobrepoe');
const afterDismiss = dismissCelebration(excellence.view);
const remarked = openCelebration(afterDismiss, { beforeDone: 12, afterDone: 13, beforeTotal: 13, afterTotal: 13 });
assertEqual(remarked.shown, null, 'remarcar nao repete 100');

const freshDay = openCelebration(initialCelebrationView(), { beforeDone: 9, afterDone: 10, beforeTotal: 13, afterTotal: 13 });
assertEqual(freshDay.shown, 'meta', 'novo dia');
assertEqual(celebrationStorageKey('user-a', '2026-10-22') === celebrationStorageKey('user-b', '2026-10-22'), false, 'usuarios diferentes');
assertEqual(celebrationStorageKey('user-a', '2026-10-22') === celebrationStorageKey('user-a', '2026-10-23'), false, 'dias diferentes');

const openedAtSeventy = noteCelebrationsLoaded(initialCelebrationView(), { meta: false, excelencia: false });
assertEqual(openedAtSeventy.visible, null, 'abrir o aplicativo nao celebra');

console.log('day-celebration-ok');
