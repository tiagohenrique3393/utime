import { Image } from 'expo-image';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { createElement, useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { DayCelebration } from '@/components/day-celebration';
import { DayPlanet } from '@/components/day-planet';
import { HabitGlyph } from '@/components/habit-glyph';
import { HydrationMeter } from '@/components/hydration-meter';
import { fonts, ui } from '@/constants/theme';
import { dailyCounts, getDailyBoard, habitsForScore, isDailyHabitDone, toggleDailyHabit, type DailyHabit } from '@/lib/daily-board';
import { dismissCelebration, initialCelebrationView, noteCelebrationsLoaded, openCelebration, type CompletionSnapshot } from '@/lib/day-celebration';
import { loadDayCelebrations, rememberDayCelebration } from '@/lib/day-celebration-store';
import { useDailyBoard } from '@/lib/use-daily-board';
import { habitPeriods, type HabitPeriod } from '@/lib/habit-catalog';
import { formatCalendarDate, formatDailyPercent, parseDateKey, todayKey, zonedHour } from '@/lib/habit-day';
import { habitIconFor, periodCopy, pillarTone } from '@/lib/habit-visual';
import { getProgressColor } from '@/lib/progress-color';
import { useRequireSession } from '@/lib/require-session';
import { HYDRATION_HABIT_ID } from '@/lib/suggested-habits';
import { getSessionUserId } from '@/lib/accounts';

const page = '#050505';
const rowPress = { cursor: 'pointer', userSelect: 'none' } as ViewStyle;
const bandColor = { red: '#FF3B4D', green: '#39FF73', gold: '#FFC94A' } as const;
const periodImage: Record<HabitPeriod, number> = {
  manha: require('@/assets/period-manha.jpg'),
  tarde: require('@/assets/period-tarde.jpg'),
  noite: require('@/assets/period-noite.jpg'),
};

function formatDayHeading(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  if (!year || !month || !day) {
    return '';
  }
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' }).format(date).replace('.', '').toUpperCase();
  const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' }).format(date).toUpperCase();
  return `${weekday}, ${day} DE ${monthName} · ${formatCalendarDate(dateKey)}`;
}

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

function Ring({ percent, color }: { percent: number; color: string }) {
  const size = 108;
  if (Platform.OS !== 'web') {
    return (
      <View style={[styles.ringFallback, { borderColor: color }]}>
        <Text style={[styles.ringValue, { color }]}>{formatDailyPercent(percent)}</Text>
      </View>
    );
  }
  const radius = 46;
  const length = 2 * Math.PI * radius;
  const offset = length * (1 - Math.max(0, Math.min(100, percent)) / 100);
  return createElement(
    'svg',
    { width: size, height: size, viewBox: '0 0 108 108', 'aria-hidden': true },
    createElement('circle', { cx: 54, cy: 54, r: radius, fill: 'none', stroke: 'rgba(255,255,255,0.08)', strokeWidth: 7 }),
    createElement('circle', {
      cx: 54,
      cy: 54,
      r: radius,
      fill: 'none',
      stroke: color,
      strokeWidth: 7,
      strokeLinecap: 'round',
      strokeDasharray: `${length} ${length}`,
      strokeDashoffset: offset,
      transform: 'rotate(-90 54 54)',
    }),
    createElement(
      'text',
      { x: 54, y: 58, textAnchor: 'middle', fill: color, fontFamily: fonts.text, fontSize: 22 },
      formatDailyPercent(percent),
    ),
  );
}

function HabitRow({ habit, checked, locked, onToggle }: { habit: DailyHabit; checked: boolean; locked: boolean; onToggle: () => void }) {
  const minutes = habit.minutes;
  const icon = habitIconFor(habit.label, habit.catalogHabitId);
  const color = pillarTone[habit.pillar];
  const body = (
    <>
      <View style={[styles.mark, checked && { backgroundColor: color, borderColor: color }]}>
        {checked ? <View style={styles.tick} /> : null}
      </View>
      <HabitGlyph name={icon} color={color} />
      <Text numberOfLines={1} style={styles.taskLabel}>
        {habit.label}
      </Text>
      {minutes ? <Text style={styles.minutes}>{`${minutes} min`}</Text> : null}
    </>
  );
  if (locked) {
    return <View style={styles.task}>{body}</View>;
  }
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={habit.label}
      onPress={onToggle}
      style={({ pressed }) => [styles.task, rowPress, pressed && styles.pressed]}>
      {body}
    </Pressable>
  );
}

export default function MyDayScreen() {
  const signedIn = useRequireSession();
  const params = useLocalSearchParams<{ data?: string | string[] }>();
  const selectedDate = parseDateKey(params.data);
  const board = useDailyBoard(selectedDate);
  const scoredHabits = habitsForScore(board.habits);
  const counts = dailyCounts(scoredHabits, board.completed);
  const locked = board.dateKey !== '' && board.dateKey !== todayKey();
  const userId = getSessionUserId();
  const tone = bandColor[getProgressColor(counts.percent)];
  const periodNow = currentPeriod();
  const [overrides, setOverrides] = useState<Partial<Record<HabitPeriod, boolean>>>({});
  const [celebration, setCelebration] = useState(initialCelebrationView);
  const celebrationRef = useRef(celebration);
  const celebrationsReady = useRef(false);
  const pendingCompletion = useRef<(CompletionSnapshot & { day: string }) | null>(null);
  const today = board.dateKey !== '' && board.dateKey === todayKey() ? board.dateKey : '';
  const celebrationScope = `${signedIn ? '1' : '0'}|${userId ?? ''}|${today}`;
  const [celebrationScopeSeen, setCelebrationScopeSeen] = useState(celebrationScope);
  if (celebrationScopeSeen !== celebrationScope) {
    setCelebrationScopeSeen(celebrationScope);
    setCelebration(initialCelebrationView());
  }

  const closeCelebration = useCallback(() => {
    const next = dismissCelebration(celebrationRef.current);
    celebrationRef.current = next;
    setCelebration(next);
  }, []);

  useEffect(() => {
    celebrationRef.current = celebration;
  }, [celebration]);

  useEffect(() => {
    celebrationsReady.current = false;
    pendingCompletion.current = null;
    if (!signedIn || !userId || !today) {
      return;
    }
    let cancel = false;
    void loadDayCelebrations(userId, today).then((seen) => {
      if (cancel) {
        return;
      }
      const pending = pendingCompletion.current;
      pendingCompletion.current = null;
      const loaded = noteCelebrationsLoaded({ visible: null, seen: celebrationRef.current.seen }, seen);
      const opened = pending && pending.day === today ? openCelebration(loaded, pending) : { view: loaded, shown: null };
      celebrationRef.current = opened.view;
      celebrationsReady.current = true;
      setCelebration(opened.view);
      if (opened.shown) {
        void rememberDayCelebration(userId, today, opened.shown);
      }
    });
    return () => {
      cancel = true;
    };
  }, [signedIn, today, userId]);

  function finishHabit(habit: DailyHabit) {
    const day = board.dateKey;
      const before = dailyCounts(habitsForScore(board.habits), board.completed);
    void toggleDailyHabit(habit).then(() => {
      const next = getDailyBoard();
      if (!day || day !== todayKey() || next.dateKey !== day) {
        return;
      }
      const after = dailyCounts(habitsForScore(next.habits), next.completed);
      const snapshot = {
        day,
        beforeDone: before.done,
        afterDone: after.done,
        beforeTotal: before.total,
        afterTotal: after.total,
      };
      if (!celebrationsReady.current) {
        pendingCompletion.current = snapshot;
        return;
      }
      const opened = openCelebration(celebrationRef.current, snapshot);
      celebrationRef.current = opened.view;
      setCelebration(opened.view);
      if (opened.shown && userId) {
        void rememberDayCelebration(userId, day, opened.shown);
      }
    });
  }
  const groups = habitPeriods.map((period) => ({
    period,
    habits: board.habits.filter((habit) => habit.period === period && habit.catalogHabitId !== HYDRATION_HABIT_ID),
  }));

  function sectionOpen(period: HabitPeriod) {
    if (overrides[period] !== undefined) {
      return overrides[period] === true;
    }
    if (selectedDate) {
      return true;
    }
    return period === periodNow;
  }

  if (!signedIn) {
    return <View style={styles.blank} />;
  }

  return (
    <>
    <AppScreen width="narrow" backgroundColor={page} backdrop={<DayPlanet />}>
      <Text style={styles.kicker}>Evolução pessoal</Text>
      <Text accessibilityRole="header" style={styles.title}>
        Meu dia
      </Text>
      {board.dateKey ? <Text style={styles.date}>{formatDayHeading(board.dateKey)}</Text> : null}

      {!board.ready ? <Text style={styles.note}>Carregando sua rotina.</Text> : null}

      {board.ready ? (
        <>
          <View style={styles.progress}>
            <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(counts.percent) }}>
              <Ring percent={counts.percent} color={tone} />
              <Text style={styles.ringCaption}>{`${counts.done} de ${counts.total} hábitos`}</Text>
            </View>
            <View style={styles.quote}>
              <Text style={styles.quoteText}>“Disciplina hoje, resultados amanhã.”</Text>
            </View>
          </View>
          <View style={styles.periods}>
            {groups.map((group) => {
              const done = group.habits.filter((habit) => isDailyHabitDone(habit, board.completed)).length;
              const icon = group.period === 'manha' ? 'run' : group.period === 'tarde' ? 'sun' : 'moon';
              const color = group.period === 'manha' ? '#E15A4C' : group.period === 'tarde' ? '#E8C88E' : '#6EB6F2';
              return (
                <View key={group.period} style={styles.periodChip}>
                  <HabitGlyph name={icon} color={color} size={14} />
                  <Text style={styles.periodCount}>{`${done}/${group.habits.length}`}</Text>
                  <Text style={styles.periodName}>{periodCopy[group.period].title}</Text>
                </View>
              );
            })}
          </View>
          {board.notice ? <Text style={styles.notice}>{board.notice}</Text> : null}
          {groups.map((group) => {
            const open = sectionOpen(group.period);
            const done = group.habits.filter((habit) => isDailyHabitDone(habit, board.completed)).length;
            const icon = group.period === 'manha' ? 'sun' : group.period === 'tarde' ? 'sun' : 'moon';
            return (
              <View key={group.period} style={styles.group}>
                <Image source={periodImage[group.period]} contentFit="cover" style={styles.periodPhoto} />
                <View pointerEvents="none" style={styles.periodShade} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open }}
                  accessibilityLabel={periodCopy[group.period].title}
                  onPress={() => setOverrides((prev) => ({ ...prev, [group.period]: !open }))}
                  style={({ pressed }) => [styles.groupHead, rowPress, pressed && styles.pressed]}>
                  <HabitGlyph name={icon} color={group.period === 'noite' ? '#8EB7E8' : '#E8C88E'} size={18} />
                  <View style={styles.groupCopy}>
                    <Text style={styles.groupTitle}>{periodCopy[group.period].title}</Text>
                    <Text style={styles.groupSubtitle}>{periodCopy[group.period].subtitle}</Text>
                  </View>
                  <Text style={styles.groupCount}>{`${done}/${group.habits.length}`}</Text>
                  <Text style={styles.chevron}>{open ? '⌃' : '⌄'}</Text>
                </Pressable>
                {open
                  ? group.habits.map((habit) => (
                      <HabitRow key={habit.id} habit={habit} checked={isDailyHabitDone(habit, board.completed)} locked={locked} onToggle={() => finishHabit(habit)} />
                    ))
                  : null}
              </View>
            );
          })}
        </>
      ) : null}

      {board.ready && userId && board.dateKey ? (
        <View style={styles.hydration}>
          <HydrationMeter userId={userId} dateKey={board.dateKey} />
        </View>
      ) : null}

      {board.ready ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/personalizar-habitos' as Href)}
          style={({ pressed }) => [styles.personalize, rowPress, pressed && styles.pressed]}>
          <Text style={styles.personalizeLabel}>Personalizar hábitos</Text>
          <Text style={styles.personalizeArrow}>›</Text>
        </Pressable>
      ) : null}
    </AppScreen>
    <DayCelebration kind={today ? celebration.visible : null} onClose={closeCelebration} />
  </>
  );
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: page },
  kicker: {
    color: ui.textChampagne,
    fontFamily: fonts.display,
    fontSize: 12,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 2,
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  date: {
    marginTop: 6,
    color: '#8E8A84',
    fontFamily: fonts.text,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  progress: { marginTop: 22, flexDirection: 'row', alignItems: 'center', gap: 14 },
  ringFallback: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: { fontFamily: fonts.text, fontSize: 22 },
  ringCaption: {
    marginTop: 6,
    color: '#8E8A84',
    fontFamily: fonts.text,
    fontSize: 11,
    letterSpacing: 0.6,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  quote: {
    flex: 1,
    minHeight: 92,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(232, 200, 142, 0.18)',
    backgroundColor: 'rgba(12, 12, 12, 0.72)',
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  quoteText: { color: ui.text, fontFamily: fonts.text, fontSize: 14, lineHeight: 20 },
  periods: { marginTop: 16, flexDirection: 'row', justifyContent: 'space-between' },
  periodChip: { alignItems: 'center', gap: 2, minWidth: 72 },
  periodCount: { color: ui.text, fontFamily: fonts.textMedium, fontSize: 13 },
  periodName: { color: '#8E8A84', fontFamily: fonts.display, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  group: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(232, 200, 142, 0.16)',
    overflow: 'hidden',
    backgroundColor: '#0A0A0A',
  },
  periodPhoto: { position: 'absolute', top: 0, right: 0, left: 0, height: 86 },
  periodShade: { position: 'absolute', top: 0, right: 0, left: 0, height: 86, backgroundColor: 'rgba(5,5,5,0.55)' },
  groupHead: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  groupCopy: { flex: 1 },
  groupTitle: { color: ui.text, fontFamily: fonts.display, fontSize: 16, letterSpacing: 1.2, textTransform: 'uppercase' },
  groupSubtitle: { color: '#A39E96', fontFamily: fonts.display, fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase' },
  groupCount: { color: ui.text, fontFamily: fonts.textMedium, fontSize: 14 },
  chevron: { color: ui.textChampagne, fontSize: 16, width: 16, textAlign: 'center' },
  task: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(243,239,232,0.08)',
    backgroundColor: 'rgba(5,5,5,0.45)',
  },
  mark: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.4,
    borderColor: 'rgba(196,192,186,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: {
    width: 7,
    height: 4,
    marginBottom: 1,
    borderLeftWidth: 1.6,
    borderBottomWidth: 1.6,
    borderColor: '#141210',
    transform: [{ rotate: '-45deg' }],
  },
  taskLabel: { flex: 1, color: ui.text, fontFamily: fonts.text, fontSize: 14 },
  minutes: { color: '#8E8A84', fontFamily: fonts.text, fontSize: 12 },
  hydration: { marginTop: 14 },
  personalize: {
    marginTop: 16,
    minHeight: 54,
    borderRadius: 999,
    backgroundColor: ui.champagneDeep,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  personalizeLabel: {
    color: '#141210',
    fontFamily: fonts.display,
    fontSize: 14,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  personalizeArrow: { color: '#141210', fontSize: 20, marginTop: -2 },
  note: { marginTop: 28, color: ui.muted, fontFamily: fonts.text, fontSize: 15 },
  notice: { marginTop: 12, color: ui.textChampagne, fontFamily: fonts.text, fontSize: 14 },
  pressed: { opacity: 0.74 },
});
