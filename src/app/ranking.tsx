import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { AppState, Text, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { CircleBoard } from '@/components/circle-board';
import { CircleDialog } from '@/components/circle-dialog';
import { CirclePlanet } from '@/components/circle-planet';
import { LegacyRanking } from '@/components/legacy-ranking';
import { fonts, ui } from '@/constants/theme';
import { getSessionUserId } from '@/lib/accounts';
import { periodStart, preferOfficialBoard, shiftPeriod, type CirclePeriod } from '@/lib/circle';
import {
  circleErrorMessage,
  circleUnavailable,
  applyAvatars,
  enrollCircle,
  fetchAvatarMap,
  fetchCircleBoard,
  fetchCircleFaces,
  fetchCircleState,
  leaveCircle,
  type CircleEntry,
  type CirclePerson,
  type CircleState,
} from '@/lib/circle-api';
import { todayKey } from '@/lib/habit-day';
import { useRequireSession } from '@/lib/require-session';

const page = '#050505';

export default function CircleScreen() {
  const signedIn = useRequireSession();
  const [mode, setMode] = useState<'loading' | 'legacy' | 'circle'>('loading');
  const [state, setState] = useState<CircleState>({ enrolled: false, handle: '', joinedAt: null, alta: 0, media: 0, baixa: 0, ready: false, returning: false });
  const [kind, setKind] = useState<CirclePeriod>('semana');
  const [start, setStart] = useState('');
  const [scope, setScope] = useState<'todos' | 'amigos'>('todos');
  const [entries, setEntries] = useState<CircleEntry[]>([]);
  const [faces, setFaces] = useState<CirclePerson[]>([]);
  const [notice, setNotice] = useState('');
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const loadMore = useRef<() => void>(() => undefined);
  const loadGeneration = useRef(0);
  const appliedAt = useRef('');

  const load = useCallback(async (nextKind: CirclePeriod, nextStart: string, nextScope: 'todos' | 'amigos') => {
    const generation = loadGeneration.current + 1;
    loadGeneration.current = generation;
    const stamp = `${new Date().toISOString()}#${String(generation).padStart(6, '0')}`;
    const today = todayKey();
    const current = periodStart(nextKind, today);
    const selected = nextStart || current;
    setStart(selected);
    try {
      const nextState = await fetchCircleState();
      if (loadGeneration.current !== generation) {
        return;
      }
      const chosen = preferOfficialBoard(appliedAt.current ? { at: appliedAt.current } : null, { at: stamp });
      if (chosen.at !== stamp) {
        return;
      }
      appliedAt.current = stamp;
      setState(nextState);
      setMode('circle');
      if (!nextState.enrolled) {
        setEntries([]);
        setFaces([]);
        return;
      }
      const [board, friends] = await Promise.all([
        fetchCircleBoard(nextKind, selected, nextScope),
        fetchCircleFaces(),
      ]);
      if (loadGeneration.current !== generation) {
        return;
      }
      setEntries(board);
      setFaces(friends);
      setNotice('');
      void fetchAvatarMap([...board, ...friends].map((item) => item.userId)).then((paths) => {
        if (!paths || loadGeneration.current !== generation) {
          return;
        }
        setEntries((currentEntries) => applyAvatars(currentEntries, paths));
        setFaces((currentFaces) => applyAvatars(currentFaces, paths));
      });
    } catch (error) {
      const details = error as { code?: string; message?: string };
      if (circleUnavailable(details)) {
        setMode('legacy');
        return;
      }
      setMode('circle');
      setNotice(circleErrorMessage(details));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let stopped = false;
      const refresh = () => {
        if (!stopped) {
          void load(kind, start || periodStart(kind, todayKey()), scope);
        }
      };
      refresh();
      const timer = setInterval(refresh, 20000);
      const appState = AppState.addEventListener('change', (next) => {
        if (next === 'active') {
          refresh();
        }
      });
      const onOnline = () => refresh();
      if (typeof window !== 'undefined') {
        window.addEventListener('online', onOnline);
      }
      return () => {
        stopped = true;
        clearInterval(timer);
        appState.remove();
        if (typeof window !== 'undefined') {
          window.removeEventListener('online', onOnline);
        }
      };
    }, [kind, load, scope, start]),
  );

  async function enroll() {
    const returning = state.returning;
    setNotice('');
    try {
      await enrollCircle();
      await load(kind, periodStart(kind, todayKey()), scope);
      if (returning) {
        setWelcomeOpen(true);
      }
    } catch (error) {
      setNotice(circleErrorMessage(error as { code?: string; message?: string }));
    }
  }

  async function confirmLeave() {
    if (leaving) {
      return;
    }
    setLeaving(true);
    try {
      await leaveCircle();
      setLeaveOpen(false);
      setEntries([]);
      setFaces([]);
      setState((current) => ({ ...current, enrolled: false, returning: true, joinedAt: null }));
      setNotice('Sua pontuação nas competições em andamento foi zerada.');
    } catch (error) {
      setNotice(circleErrorMessage(error as { code?: string; message?: string }));
    } finally {
      setLeaving(false);
    }
  }

  if (!signedIn || mode === 'legacy') {
    return mode === 'legacy' ? <LegacyRanking /> : <View style={{ flex: 1, backgroundColor: page }} />;
  }

  const today = todayKey();
  const todayStart = start ? periodStart(kind, today) : '';

  return (
    <AppScreen width="narrow" backgroundColor={page} backdrop={<CirclePlanet footing={scope === 'amigos'} />} onNearEnd={() => loadMore.current()}>
      {mode === 'loading' ? <Text style={{ marginTop: 28, color: ui.muted, fontFamily: fonts.text }}>Carregando o Círculo.</Text> : null}
      {mode === 'circle' && start ? (
        <CircleBoard
          userId={getSessionUserId() ?? ''}
          state={state}
          kind={kind}
          start={start}
          todayStart={todayStart}
          scope={scope}
          entries={entries}
          faces={faces}
          notice={notice}
          onKind={(next) => {
            setKind(next);
            setStart(periodStart(next, todayKey()));
          }}
          onShift={(delta) => {
            const next = shiftPeriod(kind, start, delta);
            if (next > todayStart) {
              return;
            }
            setStart(next);
          }}
          onScope={setScope}
          onEnroll={() => void enroll()}
          onLeave={() => setLeaveOpen(true)}
          onRetry={() => void load(kind, start, scope)}
          onBindLoadMore={(next) => {
            loadMore.current = next;
          }}
        />
      ) : null}
      <CircleDialog
        visible={leaveOpen}
        title="Sair do UTime Circle"
        body={'Tem certeza de que deseja sair do UTime Circle?\n\nAo confirmar, sua pontuação nas competições em andamento será zerada.\n\nSe voltar a participar, começará novamente com zero pontos.\n\nSeu histórico de conquistas continuará salvo.'}
        cancelLabel="Cancelar"
        confirmLabel={leaving ? 'Saindo…' : 'Confirmar saída'}
        danger
        onClose={() => {
          if (!leaving) {
            setLeaveOpen(false);
          }
        }}
        onConfirm={() => void confirmLeave()}
      />
      <CircleDialog
        visible={welcomeOpen}
        title="Bem-vindo de volta ao UTime Circle!"
        body={'Você está participando novamente!\n\nSua pontuação começa do zero.\n\nSeu histórico de conquistas continua salvo.'}
        confirmLabel="Ver ranking"
        onClose={() => setWelcomeOpen(false)}
        onConfirm={() => setWelcomeOpen(false)}
      />
    </AppScreen>
  );
}
