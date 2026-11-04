import { Image } from 'expo-image';
import { router, usePathname, type Href } from 'expo-router';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HabitGlyph } from '@/components/habit-glyph';
import { DayCelebration } from '@/components/day-celebration';
import { fonts, ui } from '@/constants/theme';
import { getSessionUserId } from '@/lib/accounts';
import {
  getDailyBoard,
  isDailyHabitDone,
  refreshDailyBoard,
  scoreDailyHabits,
  subscribeDailyBoard,
  toggleDailyHabit,
  type DailyHabit,
} from '@/lib/daily-board';
import { isOfficialHydration } from '@/lib/daily-score';
import { dismissCelebration, initialCelebrationView, openCelebration, type CelebrationKind } from '@/lib/day-celebration';
import { loadDayCelebrations, rememberDayCelebration } from '@/lib/day-celebration-store';
import { zonedHour, todayKey } from '@/lib/habit-day';
import type { HabitPeriod } from '@/lib/habit-catalog';
import { habitIconFor } from '@/lib/habit-visual';
import { nextHabitCopy } from '@/lib/next-habit-copy';
import { acknowledgeNextHabit, shouldShowNextHabit } from '@/lib/next-habit-entry';
import { nextPendingHabit } from '@/lib/next-habit';

const periodImage: Record<HabitPeriod, number> = {
  manha: require('@/assets/period-manha.jpg'),
  tarde: require('@/assets/period-tarde.jpg'),
  noite: require('@/assets/period-noite.jpg'),
};

function currentPeriod(date = new Date()): HabitPeriod {
  const hour = zonedHour(date);
  if (hour < 12) {
    return 'manha';
  }
  if (hour < 18) {
    return 'tarde';
  }
  return 'noite';
}

function isAuthScreen(pathname: string) {
  return pathname === '/' || pathname.startsWith('/entrar') || pathname.startsWith('/cadastro') || pathname.startsWith('/recuperar') || pathname.startsWith('/redefinir') || pathname.startsWith('/boas-vindas');
}

export function NextHabitPrompt() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const board = useSyncExternalStore(subscribeDailyBoard, getDailyBoard, getDailyBoard);
  const userId = getSessionUserId();
  const [habit, setHabit] = useState<DailyHabit | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [celebration, setCelebration] = useState(initialCelebrationView);

  useEffect(() => {
    if (!userId) {
      setHabit(null);
      return;
    }
    void refreshDailyBoard(userId);
  }, [userId]);

  useEffect(() => {
    if (!userId || isAuthScreen(pathname) || !board.ready || board.dateKey !== todayKey()) {
      return;
    }
    if (!shouldShowNextHabit(userId)) {
      return;
    }
    const scheduled = board.habits
      .filter((item) => !isOfficialHydration(item.catalogHabitId) && habitIconFor(item.label, item.catalogHabitId) !== 'drop')
      .map((item) => ({
        id: item.id,
        label: item.label,
        period: item.period,
        minutes: item.minutes,
        done: isDailyHabitDone(item, board.completed),
      }));
    const next = nextPendingHabit(scheduled, currentPeriod());
    if (!next) {
      acknowledgeNextHabit(userId);
      setHabit(null);
      return;
    }
    const match = board.habits.find((item) => item.id === next.id) ?? null;
    setHabit(match);
  }, [board, pathname, userId]);

  function finishOffer() {
    if (userId) {
      acknowledgeNextHabit(userId);
    }
    setHabit(null);
    setNotice('');
    setBusy(false);
  }

  async function complete() {
    if (!habit || !userId || busy) {
      return;
    }
    if (isDailyHabitDone(habit, getDailyBoard().completed)) {
      finishOffer();
      return;
    }
    setBusy(true);
    const day = getDailyBoard().dateKey;
    const before = scoreDailyHabits(getDailyBoard().habits, getDailyBoard().completed);
    const wasDone = isDailyHabitDone(habit, getDailyBoard().completed);
    await toggleDailyHabit(habit);
    const next = getDailyBoard();
    const nowDone = isDailyHabitDone(habit, next.completed);
    if (wasDone === nowDone) {
      setBusy(false);
      setNotice(next.notice || 'Não foi possível registrar o check-in.');
      return;
    }
    const after = scoreDailyHabits(next.habits, next.completed);
    const seen = await loadDayCelebrations(userId, day);
    const opened = openCelebration({ visible: null, seen }, {
      beforeDone: before.done,
      afterDone: after.done,
      beforeTotal: before.total,
      afterTotal: after.total,
    });
    finishOffer();
    if (opened.shown) {
      setCelebration(opened.view);
      void rememberDayCelebration(userId, day, opened.shown);
    }
  }

  const copy = habit ? nextHabitCopy(habit.label, habit.minutes) : null;
  const icon = habit ? habitIconFor(habit.label, habit.catalogHabitId) : 'target';

  return (
    <>
      <Modal visible={habit !== null && celebration.visible === null} transparent animationType="fade" onRequestClose={finishOffer} statusBarTranslucent>
        <View style={[styles.scrim, { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 16) }]}>
          {habit && copy ? (
            <View accessibilityViewIsModal style={styles.card}>
              <Image source={periodImage[habit.period]} contentFit="cover" style={styles.photo} />
              <View style={styles.shade} />
              <Pressable accessibilityRole="button" accessibilityLabel="Fechar" hitSlop={8} onPress={finishOffer} style={styles.close}>
                <Text style={styles.closeLabel}>×</Text>
              </Pressable>
              <Text style={styles.kicker}>Seu próximo hábito</Text>
              <HabitGlyph name={icon} color={ui.champagne} size={28} />
              <Text style={styles.headline}>{copy.headline}</Text>
              <Text style={styles.question}>{copy.question}</Text>
              <Text style={styles.detail}>{copy.detail}</Text>
              {notice ? <Text style={styles.notice}>{notice}</Text> : null}
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                onPress={() => void complete()}
                style={styles.primary}>
                <Text style={styles.primaryLabel}>{busy ? 'Salvando' : 'Marcar como concluído'}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  finishOffer();
                  if (pathname !== '/meu-dia') {
                    router.navigate('/meu-dia' as Href);
                  }
                }}
                style={styles.secondary}>
                <Text style={styles.secondaryLabel}>Ver meu dia</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </Modal>
      <DayCelebration
        kind={celebration.visible as CelebrationKind | null}
        onClose={() => setCelebration((current) => dismissCelebration(current))}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(232,201,155,0.5)',
    backgroundColor: '#0C0C0C',
    overflow: 'hidden',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 18,
    paddingTop: 148,
  },
  photo: { position: 'absolute', top: 0, right: 0, left: 0, height: 168 },
  shade: { position: 'absolute', top: 0, right: 0, left: 0, height: 168, backgroundColor: 'rgba(0,0,0,0.55)' },
  close: { position: 'absolute', top: 10, right: 10, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  closeLabel: { color: ui.text, fontSize: 22 },
  kicker: {
    color: ui.champagne,
    fontFamily: fonts.display,
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  headline: {
    marginTop: 8,
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 28,
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  question: {
    marginTop: 8,
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 16,
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  detail: {
    marginTop: 8,
    color: '#C8C2B8',
    fontFamily: fonts.text,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  notice: { marginTop: 8, color: '#E7B4B4', fontFamily: fonts.text, fontSize: 13, textAlign: 'center' },
  primary: {
    marginTop: 16,
    alignSelf: 'stretch',
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: ui.champagneDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: { color: '#141210', fontFamily: fonts.display, fontSize: 15, letterSpacing: 0.8, textTransform: 'uppercase' },
  secondary: {
    marginTop: 8,
    alignSelf: 'stretch',
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(243,239,232,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: { color: ui.text, fontFamily: fonts.display, fontSize: 14, letterSpacing: 0.8, textTransform: 'uppercase' },
});
