import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { CircleBoard } from '@/components/circle-board';
import { CirclePlanet } from '@/components/circle-planet';
import { LegacyRanking } from '@/components/legacy-ranking';
import { fonts, ui } from '@/constants/theme';
import { getSessionUserId } from '@/lib/accounts';
import { periodStart, shiftPeriod, type CirclePeriod } from '@/lib/circle';
import {
  circleErrorMessage,
  circleUnavailable,
  enrollCircle,
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
  const [state, setState] = useState<CircleState>({ hasAccess: false, enrolled: false, handle: '', joinedAt: null });
  const [kind, setKind] = useState<CirclePeriod>('semana');
  const [start, setStart] = useState('');
  const [scope, setScope] = useState<'todos' | 'amigos'>('todos');
  const [entries, setEntries] = useState<CircleEntry[]>([]);
  const [faces, setFaces] = useState<CirclePerson[]>([]);
  const [notice, setNotice] = useState('');
  const [confirmingLeave, setConfirmingLeave] = useState(false);

  const load = useCallback(async (nextKind: CirclePeriod, nextStart: string, nextScope: 'todos' | 'amigos') => {
    const today = todayKey();
    const current = periodStart(nextKind, today);
    const selected = nextStart || current;
    setStart(selected);
    try {
      const nextState = await fetchCircleState();
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
      setEntries(board);
      setFaces(friends);
      setNotice('');
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
      const today = todayKey();
      void load(kind, start || periodStart(kind, today), scope);
    }, [kind, load, scope, start]),
  );

  async function enroll() {
    setNotice('');
    try {
      await enrollCircle();
      await load(kind, periodStart(kind, todayKey()), scope);
    } catch (error) {
      setNotice(circleErrorMessage(error as { code?: string; message?: string }));
    }
  }

  async function leave() {
    if (!confirmingLeave) {
      setConfirmingLeave(true);
      return;
    }
    setConfirmingLeave(false);
    try {
      await leaveCircle();
      setEntries([]);
      setState((current) => ({ ...current, enrolled: false }));
    } catch (error) {
      setNotice(circleErrorMessage(error as { code?: string; message?: string }));
    }
  }

  if (!signedIn || mode === 'legacy') {
    return mode === 'legacy' ? <LegacyRanking /> : <View style={{ flex: 1, backgroundColor: page }} />;
  }

  const today = todayKey();
  const todayStart = start ? periodStart(kind, today) : '';

  return (
    <AppScreen width="narrow" backgroundColor={page} backdrop={<CirclePlanet />}>
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
          confirmingLeave={confirmingLeave}
          onKind={(next) => {
            setConfirmingLeave(false);
            setKind(next);
            setStart(periodStart(next, todayKey()));
          }}
          onShift={(delta) => {
            const next = shiftPeriod(kind, start, delta);
            if (next > todayStart) {
              return;
            }
            setConfirmingLeave(false);
            setStart(next);
          }}
          onScope={(next) => {
            setConfirmingLeave(false);
            setScope(next);
          }}
          onEnroll={() => void enroll()}
          onLeave={() => void leave()}
        />
      ) : null}
    </AppScreen>
  );
}
