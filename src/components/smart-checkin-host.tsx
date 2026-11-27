import { router, usePathname, type Href } from 'expo-router';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AppState, Modal, Platform, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DayCelebration } from '@/components/day-celebration';
import { MoodCheckinModal } from '@/components/mood-checkin-modal';
import { NextHabitCard } from '@/components/next-habit-prompt';
import { SleepCheckinModal } from '@/components/sleep-checkin-modal';
import { getSessionUserId } from '@/lib/accounts';
import { nextCheckinStep, type CheckinStep } from '@/lib/checkin-flow';
import { isPromptClosed, loadPromptState, rememberPromptState } from '@/lib/checkin-prompt-store';
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
import { todayKey } from '@/lib/habit-day';
import { habitIconFor } from '@/lib/habit-visual';
import { modalGateOpen } from '@/lib/modal-gate';
import { moodPeriodAt, type MoodPeriod } from '@/lib/mood-score';
import { loadMoodCheckin, saveMoodCheckin } from '@/lib/mood-store';
import { nextHabitCopy } from '@/lib/next-habit-copy';
import { acknowledgeNextHabit, armIdleReminder, idleReminderPending, noteHumanActivity, shouldShowNextHabit } from '@/lib/next-habit-entry';
import { nextPendingHabit } from '@/lib/next-habit';
import { getProfileSnapshot, subscribeProfile } from '@/lib/profile';
import { reminderArt } from '@/lib/reminder-art';
import { loadSleepCheckin, saveSleepCheckin } from '@/lib/sleep-store';
import {
  acknowledgeSmartCheckinWave,
  noteSmartCheckinSurface,
  shouldRunSmartCheckin,
} from '@/lib/smart-checkin-session';

function currentHabitPeriod(date = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hourCycle: 'h23' })
      .formatToParts(date)
      .find((part) => part.type === 'hour')?.value ?? '0',
  );
  if (hour < 12) {
    return 'manha' as const;
  }
  if (hour < 18) {
    return 'tarde' as const;
  }
  return 'noite' as const;
}

function isAuthScreen(pathname: string) {
  return (
    pathname === '/' ||
    pathname.startsWith('/entrar') ||
    pathname.startsWith('/cadastro') ||
    pathname.startsWith('/recuperar') ||
    pathname.startsWith('/redefinir') ||
    pathname.startsWith('/boas-vindas')
  );
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

export function SmartCheckinHost() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const board = useSyncExternalStore(subscribeDailyBoard, getDailyBoard, getDailyBoard);
  const profile = useSyncExternalStore(subscribeProfile, getProfileSnapshot, getProfileSnapshot);
  const userId = getSessionUserId();
  const [step, setStep] = useState<CheckinStep | null>(null);
  const [habit, setHabit] = useState<DailyHabit | null>(null);
  const [moodPeriod, setMoodPeriod] = useState<MoodPeriod>('manha');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [celebration, setCelebration] = useState(initialCelebrationView);
  const stepRef = useRef<CheckinStep | null>(null);
  const habitRef = useRef<DailyHabit | null>(null);
  const celebrationRef = useRef(celebration);
  const pathnameRef = useRef(pathname);
  const resolving = useRef(false);

  useEffect(() => {
    stepRef.current = step;
    habitRef.current = habit;
    celebrationRef.current = celebration;
    pathnameRef.current = pathname;
  }, [step, habit, celebration, pathname]);

  useEffect(() => {
    if (userId) {
      void refreshDailyBoard(userId);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      noteHumanActivity(userId);
    }
  }, [pathname, userId]);

  useEffect(() => {
    const onVisibility = () => {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        noteSmartCheckinSurface(document.visibilityState === 'visible');
      }
    };
    const onApp = (state: string) => {
      noteSmartCheckinSurface(state === 'active');
    };
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
    }
    const sub = AppState.addEventListener('change', onApp);
    return () => {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
      }
      sub.remove();
    };
  }, []);

  async function resolveNext(forceIdleHabit = false) {
    const owner = getSessionUserId();
    if (!owner || resolving.current || habitRef.current || celebrationRef.current.visible || stepRef.current) {
      return;
    }
    if (!surfaceActive() || anotherModalOpen() || isAuthScreen(pathnameRef.current)) {
      return;
    }
    const current = getDailyBoard();
    if (!current.ready || current.dateKey !== todayKey()) {
      return;
    }
    resolving.current = true;
    try {
      const day = todayKey();
      const period = moodPeriodAt();
      await Promise.all([
        loadPromptState(owner, 'next_habit', day),
        loadPromptState(owner, 'sleep', day),
        loadPromptState(owner, 'mood', day, period),
        loadSleepCheckin(owner, day),
        loadMoodCheckin(owner, day, period),
      ]);

      const scheduled = current.habits
        .filter((item) => !isOfficialHydration(item.catalogHabitId) && habitIconFor(item.label, item.catalogHabitId) !== 'drop')
        .map((item) => ({
          id: item.id,
          label: item.label,
          period: item.period,
          minutes: item.minutes,
          done: isDailyHabitDone(item, current.completed),
        }));
      const pending = nextPendingHabit(scheduled, currentHabitPeriod());
      const habitEligible =
        Boolean(pending) &&
        (forceIdleHabit || shouldShowNextHabit(owner) || shouldRunSmartCheckin(owner)) &&
        !isPromptClosed(owner, 'next_habit', day);

      const sleepRow = await loadSleepCheckin(owner, day);
      const sleepEligible =
        shouldRunSmartCheckin(owner) &&
        !isPromptClosed(owner, 'sleep', day) &&
        sleepRow.ok &&
        sleepRow.row == null;

      const moodRow = await loadMoodCheckin(owner, day, period);
      const moodEligible =
        shouldRunSmartCheckin(owner) &&
        !isPromptClosed(owner, 'mood', day, period) &&
        moodRow.ok &&
        moodRow.row == null;

      const next = nextCheckinStep({
        habitEligible: Boolean(habitEligible && pending),
        sleepEligible,
        moodEligible,
        moodPeriod: period,
      });

      if (!next) {
        if (shouldRunSmartCheckin(owner)) {
          acknowledgeSmartCheckinWave(owner);
        }
        return;
      }

      if (next.kind === 'next_habit' && pending) {
        const match = current.habits.find((item) => item.id === pending.id) ?? null;
        if (!match) {
          acknowledgeNextHabit(owner);
          return;
        }
        await rememberPromptState(owner, 'next_habit', day, 'presented');
        habitRef.current = match;
        setHabit(match);
        setStep(next);
        return;
      }

      if (next.kind === 'sleep') {
        await rememberPromptState(owner, 'sleep', day, 'presented');
        setStep(next);
        return;
      }

      if (next.kind === 'mood') {
        await rememberPromptState(owner, 'mood', day, 'presented', next.period);
        setMoodPeriod(next.period);
        setStep(next);
      }
    } finally {
      resolving.current = false;
    }
  }

  useEffect(() => {
    if (!userId || isAuthScreen(pathname)) {
      return;
    }
    void resolveNext();
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
      if (shouldRunSmartCheckin(owner) || shouldShowNextHabit(owner)) {
        void resolveNext();
        return;
      }
      if (!idleReminderPending(owner)) {
        armIdleReminder(owner);
      }
      if (idleReminderPending(owner)) {
        void resolveNext(true);
      }
    };
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [userId]);

  function clearStep() {
    stepRef.current = null;
    setStep(null);
    setNotice('');
    setBusy(false);
  }

  function finishHabitOffer() {
    if (userId) {
      acknowledgeNextHabit(userId);
      void rememberPromptState(userId, 'next_habit', todayKey(), 'dismissed');
    }
    habitRef.current = null;
    setHabit(null);
    clearStep();
    queueMicrotask(() => void resolveNext());
  }

  async function completeHabit() {
    if (!habit || !userId || busy) {
      return;
    }
    if (isDailyHabitDone(habit, getDailyBoard().completed)) {
      finishHabitOffer();
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
    const opened = openCelebration(
      { visible: null, seen },
      {
        beforeDone: before.done,
        afterDone: after.done,
        beforeTotal: before.total,
        afterTotal: after.total,
      },
    );
    acknowledgeNextHabit(userId);
    await rememberPromptState(userId, 'next_habit', day, 'answered');
    habitRef.current = null;
    setHabit(null);
    clearStep();
    if (opened.shown) {
      setCelebration(opened.view);
      void rememberDayCelebration(userId, day, opened.shown);
    } else {
      queueMicrotask(() => void resolveNext());
    }
  }

  async function saveSleep(hours: number, quality: number, note: string) {
    if (!userId || busy) {
      return;
    }
    setBusy(true);
    const result = await saveSleepCheckin(userId, { hours, quality, note });
    if (!result.ok) {
      setBusy(false);
      setNotice(result.message);
      return;
    }
    await rememberPromptState(userId, 'sleep', todayKey(), 'answered');
    clearStep();
    queueMicrotask(() => void resolveNext());
  }

  async function dismissSleep() {
    if (!userId) {
      clearStep();
      return;
    }
    await rememberPromptState(userId, 'sleep', todayKey(), 'dismissed');
    clearStep();
    queueMicrotask(() => void resolveNext());
  }

  async function saveMood(level: number, period: typeof moodPeriod, note: string) {
    if (!userId || busy) {
      return;
    }
    setBusy(true);
    const result = await saveMoodCheckin(userId, { period, level, note });
    if (!result.ok) {
      setBusy(false);
      setNotice(result.message);
      return;
    }
    await rememberPromptState(userId, 'mood', todayKey(), 'answered', period);
    acknowledgeSmartCheckinWave(userId);
    clearStep();
  }

  async function dismissMood() {
    if (!userId) {
      clearStep();
      return;
    }
    await rememberPromptState(userId, 'mood', todayKey(), 'dismissed', moodPeriod);
    acknowledgeSmartCheckinWave(userId);
    clearStep();
  }

  const copy = habit ? nextHabitCopy(habit.label, habit.minutes) : null;
  const art = habit ? reminderArt(habit.pillar, profile.journey) : null;
  const showHabit = step?.kind === 'next_habit' && habit !== null && celebration.visible === null;

  return (
    <>
      <Modal visible={showHabit} transparent animationType="fade" onRequestClose={finishHabitOffer} statusBarTranslucent>
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
              onClose={finishHabitOffer}
              onComplete={() => void completeHabit()}
              onOpenDay={() => {
                finishHabitOffer();
                if (pathname !== '/meu-dia') {
                  router.navigate('/meu-dia' as Href);
                }
              }}
            />
          ) : null}
        </View>
      </Modal>

      <SleepCheckinModal
        visible={step?.kind === 'sleep'}
        busy={busy}
        notice={notice}
        onSave={(hours, quality, note) => void saveSleep(hours, quality, note)}
        onDismiss={() => void dismissSleep()}
      />

      <MoodCheckinModal
        visible={step?.kind === 'mood'}
        period={moodPeriod}
        busy={busy}
        notice={notice}
        onSave={(level, period, note) => void saveMood(level, period, note)}
        onDismiss={() => void dismissMood()}
      />

      <DayCelebration
        kind={celebration.visible as CelebrationKind | null}
        onClose={() => {
          setCelebration((current) => dismissCelebration(current));
          queueMicrotask(() => void resolveNext());
        }}
      />
    </>
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
});
