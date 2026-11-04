import { Image } from 'expo-image';
import { router, usePathname, type Href } from 'expo-router';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AppState, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
import { todayKey, zonedHour } from '@/lib/habit-day';
import { pillarLabels, type HabitPeriod, type HabitPillar } from '@/lib/habit-catalog';
import { habitIconFor } from '@/lib/habit-visual';
import { modalGateOpen } from '@/lib/modal-gate';
import { nextHabitCopy } from '@/lib/next-habit-copy';
import { acknowledgeNextHabit, armIdleReminder, idleReminderPending, noteHumanActivity, shouldShowNextHabit } from '@/lib/next-habit-entry';
import { nextPendingHabit } from '@/lib/next-habit';
import { getProfileSnapshot, subscribeProfile } from '@/lib/profile';
import { reminderArt, type ReminderArt } from '@/lib/reminder-art';

const pillarArt: Record<ReminderArt, number> = {
  mantime: require('@/assets/pillars/corpo-mantime.png'),
  womantime: require('@/assets/pillars/corpo-womantime.png'),
  mente: require('@/assets/pillars/mente.png'),
  espirito: require('@/assets/pillars/espirito.png'),
};

const reminderFill = {
  backgroundColor: '#E8C99B',
  experimental_backgroundImage: 'linear-gradient(180deg, #F6E7C8 0%, #E8C99B 58%, #C4A574 100%)',
} as const;

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

function surfaceActive() {
  if (Platform.OS === 'web') {
    return typeof document === 'undefined' || document.visibilityState === 'visible';
  }
  return AppState.currentState === 'active';
}

function anotherModalOpen() {
  if (modalGateOpen()) {
    return true;
  }
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    return document.querySelector('[aria-modal="true"]') != null;
  }
  return false;
}

export function NextHabitPrompt() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const board = useSyncExternalStore(subscribeDailyBoard, getDailyBoard, getDailyBoard);
  const profile = useSyncExternalStore(subscribeProfile, getProfileSnapshot, getProfileSnapshot);
  const userId = getSessionUserId();
  const [habit, setHabit] = useState<DailyHabit | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [celebration, setCelebration] = useState(initialCelebrationView);
  const habitRef = useRef<DailyHabit | null>(null);
  const celebrationRef = useRef(celebration);
  const pathnameRef = useRef(pathname);
  habitRef.current = habit;
  celebrationRef.current = celebration;
  pathnameRef.current = pathname;

  useEffect(() => {
    if (!userId) {
      setHabit(null);
      return;
    }
    void refreshDailyBoard(userId);
  }, [userId]);

  useEffect(() => {
    if (userId) {
      noteHumanActivity(userId);
    }
  }, [pathname, userId]);

  function offer() {
    const owner = getSessionUserId();
    const current = getDailyBoard();
    if (!owner || habitRef.current || celebrationRef.current.visible) {
      return;
    }
    if (!surfaceActive() || anotherModalOpen() || isAuthScreen(pathnameRef.current) || !current.ready || current.dateKey !== todayKey()) {
      return;
    }
    const scheduled = current.habits
      .filter((item) => !isOfficialHydration(item.catalogHabitId) && habitIconFor(item.label, item.catalogHabitId) !== 'drop')
      .map((item) => ({
        id: item.id,
        label: item.label,
        period: item.period,
        minutes: item.minutes,
        done: isDailyHabitDone(item, current.completed),
      }));
    const next = nextPendingHabit(scheduled, currentPeriod());
    if (!next) {
      acknowledgeNextHabit(owner);
      setHabit(null);
      return;
    }
    const match = current.habits.find((item) => item.id === next.id) ?? null;
    if (!match) {
      acknowledgeNextHabit(owner);
      return;
    }
    habitRef.current = match;
    setHabit(match);
  }

  useEffect(() => {
    if (!userId || isAuthScreen(pathname) || !shouldShowNextHabit(userId)) {
      return;
    }
    offer();
  }, [board, pathname, userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }
    const tick = () => {
      const owner = getSessionUserId();
      if (!owner || !surfaceActive() || isAuthScreen(pathnameRef.current)) {
        return;
      }
      if (shouldShowNextHabit(owner)) {
        offer();
        return;
      }
      if (!idleReminderPending(owner)) {
        armIdleReminder(owner);
      }
      if (idleReminderPending(owner)) {
        offer();
      }
    };
    const timer = setInterval(tick, 1000);
    const app = AppState.addEventListener('change', tick);
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', tick);
    }
    return () => {
      clearInterval(timer);
      app.remove();
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', tick);
      }
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }
    const mark = () => {
      const owner = getSessionUserId();
      if (owner) {
        noteHumanActivity(owner);
      }
    };
    const options = { capture: true, passive: true } as AddEventListenerOptions;
    window.addEventListener('pointerdown', mark, options);
    window.addEventListener('keydown', mark, options);
    window.addEventListener('wheel', mark, options);
    window.addEventListener('touchstart', mark, options);
    window.addEventListener('scroll', mark, options);
    return () => {
      window.removeEventListener('pointerdown', mark, options);
      window.removeEventListener('keydown', mark, options);
      window.removeEventListener('wheel', mark, options);
      window.removeEventListener('touchstart', mark, options);
      window.removeEventListener('scroll', mark, options);
    };
  }, [userId]);

  function finishOffer() {
    if (userId) {
      acknowledgeNextHabit(userId);
    }
    habitRef.current = null;
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
  const art = habit ? reminderArt(habit.pillar, profile.journey) : null;

  return (
    <>
      <Modal visible={habit !== null && celebration.visible === null} transparent animationType="fade" onRequestClose={finishOffer} statusBarTranslucent>
        <View style={[styles.scrim, { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 16) }]}>
          {habit && copy ? (
            <NextHabitCard
              label={copy.headline}
              pillar={habit.pillar}
              art={art}
              question={copy.question}
              detail={copy.detail}
              busy={busy}
              notice={notice}
              onClose={finishOffer}
              onComplete={() => void complete()}
              onOpenDay={() => {
                finishOffer();
                if (pathname !== '/meu-dia') {
                  router.navigate('/meu-dia' as Href);
                }
              }}
            />
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

export function NextHabitCard({
  label,
  pillar,
  art,
  question,
  detail,
  busy,
  notice,
  onClose,
  onComplete,
  onOpenDay,
}: {
  label: string;
  pillar: HabitPillar | null;
  art: ReminderArt | null;
  question: string;
  detail: string;
  busy: boolean;
  notice: string;
  onClose: () => void;
  onComplete: () => void;
  onOpenDay: () => void;
}) {
  return (
    <View accessibilityViewIsModal style={styles.card}>
      <View style={styles.head}>
        <View style={styles.dot} />
        <Text style={styles.kicker}>Seu próximo hábito</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Fechar" hitSlop={8} onPress={onClose} style={styles.close}>
          <Text style={styles.closeLabel}>×</Text>
        </Pressable>
      </View>
      {art ? (
        <View style={styles.scene}>
          <Image source={pillarArt[art]} contentFit="contain" style={styles.sceneImage} accessibilityLabel={pillar ? pillarLabels[pillar] : ''} />
        </View>
      ) : null}
      {pillar ? <Text style={styles.pillar}>{pillarLabels[pillar]}</Text> : null}
      <Text style={styles.headline}>{label}</Text>
      <Text style={styles.question}>{question}</Text>
      <Text style={styles.detail}>{detail}</Text>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: busy }}
        disabled={busy}
        onPress={onComplete}
        style={[styles.primary, reminderFill]}>
        <Text style={styles.primaryLabel}>{busy ? 'Salvando' : '✓  Marcar como concluído'}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onOpenDay} style={styles.secondary}>
        <Text style={styles.secondaryLabel}>Ver meu dia</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E8C99B',
    backgroundColor: '#070707',
    overflow: 'hidden',
    paddingBottom: 16,
    boxShadow: '0 0 22px rgba(232,201,155,0.28)',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 14 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: ui.champagne },
  kicker: {
    flex: 1,
    color: '#FFFFFF',
    fontFamily: fonts.display,
    fontSize: 16,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  close: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  closeLabel: { color: '#FFFFFF', fontSize: 22, lineHeight: 24 },
  scene: { height: 196, marginTop: 8, alignItems: 'center', justifyContent: 'center' },
  sceneImage: { width: '100%', height: '100%' },
  pillar: {
    marginTop: 4,
    paddingHorizontal: 18,
    color: '#FFFFFF',
    fontFamily: fonts.display,
    fontSize: 13,
    letterSpacing: 1.6,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  headline: {
    marginTop: 4,
    paddingHorizontal: 18,
    color: ui.champagne,
    fontFamily: fonts.display,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  question: {
    marginTop: 8,
    paddingHorizontal: 18,
    color: '#FFFFFF',
    fontFamily: fonts.display,
    fontSize: 14,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  detail: {
    marginTop: 4,
    paddingHorizontal: 22,
    color: '#B7B2AA',
    fontFamily: fonts.text,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  notice: { marginTop: 8, color: '#E7B4B4', fontFamily: fonts.text, fontSize: 13, textAlign: 'center', paddingHorizontal: 16 },
  primary: {
    marginTop: 14,
    marginHorizontal: 16,
    minHeight: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: { color: '#141210', fontFamily: fonts.display, fontSize: 15, letterSpacing: 0.6, textTransform: 'uppercase' },
  secondary: {
    marginTop: 8,
    marginHorizontal: 16,
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(243,239,232,0.28)',
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: { color: '#FFFFFF', fontFamily: fonts.display, fontSize: 14, letterSpacing: 0.8, textTransform: 'uppercase' },
});
