import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View, type TextStyle } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { DayProgress } from '@/components/day-progress';
import { HomeActionBlock } from '@/components/home-action-block';
import { HojePlanet } from '@/components/hoje-planet';
import { PillarCard } from '@/components/pillar-card';
import { fonts, ui } from '@/constants/theme';
import { habitsForScore, isDailyHabitDone, scoreDailyHabits } from '@/lib/daily-board';
import { useDailyBoard } from '@/lib/use-daily-board';
import { formatDailyPercent, todayKey } from '@/lib/habit-day';
import { greetingParts, homeDateParts } from '@/lib/home-copy';
import { periodCopy } from '@/lib/habit-visual';
import { hydrationDaySnapshot, loadHydration, subscribeHydrationDay } from '@/lib/hydration';
import { nextScheduledHabit } from '@/lib/next-habit';
import { getProfileSnapshot, subscribeProfile } from '@/lib/profile';
import { useRequireSession } from '@/lib/require-session';
import { getSessionUserId } from '@/lib/accounts';
import { weeklyPhrase } from '@/lib/weekly-phrase';

const nowrap = { whiteSpace: 'nowrap' } as unknown as TextStyle;

export default function TodayScreen() {
  const signedIn = useRequireSession();
  const { height, width } = useWindowDimensions();
  const compact = height < 740 || width < 360;
  const stacked = width < 340;
  const profile = useSyncExternalStore(subscribeProfile, getProfileSnapshot, getProfileSnapshot);
  const board = useDailyBoard();
  const [now, setNow] = useState<Date | null>(null);
  const userId = getSessionUserId();
  const phraseKey = board.dateKey || (now ? todayKey(now) : '');
  const hydration = useSyncExternalStore(
    subscribeHydrationDay,
    () => (userId && phraseKey ? hydrationDaySnapshot(userId, phraseKey) : null),
    () => (userId && phraseKey ? hydrationDaySnapshot(userId, phraseKey) : null),
  );

  useFocusEffect(
    useCallback(() => {
      setNow(new Date());
    }, []),
  );

  useEffect(() => {
    if (userId && phraseKey) {
      void loadHydration(userId, phraseKey);
    }
  }, [phraseKey, userId]);

  const scored = habitsForScore(board.habits);
  const score = scoreDailyHabits(board.habits, board.completed);
  const percent = score.percent;
  const pillars = score.pillars.map((pillar) => ({
    id: pillar.id,
    label: pillar.label,
    percent: pillar.percent,
  }));
  const hello = now ? greetingParts(now, profile.firstName) : { hello: '', name: '' };
  const dateParts = phraseKey ? homeDateParts(phraseKey) : { dayMonth: '', weekday: '' };
  const phrase = phraseKey ? weeklyPhrase(phraseKey) : '';
  const feminine = profile.journey === 'womantime';
  const scheduled = scored.map((habit) => ({
    id: habit.id,
    label: habit.label,
    period: habit.period,
    minutes: habit.minutes,
    done: isDailyHabitDone(habit, board.completed),
  }));
  const nextHabit = board.ready ? nextScheduledHabit(scheduled) : null;
  const allDone = board.ready && scheduled.length > 0 && nextHabit === null;
  const noneScheduled = board.ready && scheduled.length === 0;

  if (!signedIn) {
    return <View style={styles.blocked} />;
  }

  const habitTitle = allDone
    ? 'Todos concluídos'
    : noneScheduled
      ? 'Nenhum hábito hoje'
      : nextHabit?.label ?? '';
  const habitDetail = nextHabit
    ? [periodCopy[nextHabit.period].title, nextHabit.minutes ? `${nextHabit.minutes} min` : '']
        .filter(Boolean)
        .join(' · ')
    : allDone
      ? 'Excelência do dia'
      : '';
  const habitPillar = nextHabit ? board.habits.find((habit) => habit.id === nextHabit.id)?.pillar ?? null : null;

  return (
    <AppScreen width="stage" backdrop={<HojePlanet />} navVariant="hoje">
      <Text accessibilityRole="header" style={[styles.helloLine, compact && styles.helloCompact]}>
        <Text style={styles.hello}>{hello.name ? `${hello.hello}, ` : hello.hello}</Text>
        {hello.name ? <Text style={styles.helloName}>{hello.name}</Text> : null}
      </Text>

      <View style={styles.dateBlock}>
        <Text style={styles.kicker}>Hoje</Text>
        {dateParts.dayMonth ? <Text style={styles.date}>{dateParts.dayMonth}</Text> : null}
        {dateParts.weekday ? <Text style={styles.weekday}>{dateParts.weekday}</Text> : null}
      </View>

      <View style={[styles.progressRow, stacked && styles.progressStacked]}>
        <View style={styles.hero}>
          <Text
            numberOfLines={1}
            style={[styles.figure, compact && styles.figureCompact, nowrap]}
            accessibilityLabel={`${formatDailyPercent(percent)} do seu dia`}>
            {formatDailyPercent(percent).replace(/%$/, '')}
            <Text style={[styles.figureMark, compact && styles.figureMarkCompact]}>%</Text>
          </Text>
          <Text style={styles.figureLabel}>Seu dia</Text>
        </View>
        <View style={styles.meter}>
          <DayProgress percent={percent} marked />
        </View>
      </View>

      <View style={styles.pillars}>
        {pillars.map((pillar) => (
          <PillarCard
            key={pillar.id}
            id={pillar.id}
            label={pillar.label}
            percent={pillar.percent}
            feminine={feminine}
          />
        ))}
      </View>

      <HomeActionBlock
        hydration={hydration}
        habitTitle={habitTitle}
        habitDetail={habitDetail}
        habitPillar={habitPillar}
        journey={profile.journey}
        completed={allDone}
        onOpenHabit={() => router.push('/meu-dia' as Href)}
      />

      {phrase ? (
        <View style={styles.quote}>
          <Text style={styles.quoteMark}>“</Text>
          <View style={styles.quoteRule} />
          <Text style={styles.quoteText}>{phrase}</Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ver meu dia"
        onPress={() => router.push('/meu-dia' as Href)}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <Text style={styles.buttonLabel}>Ver meu dia</Text>
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  blocked: {
    flex: 1,
    backgroundColor: ui.background,
  },
  helloLine: {
    marginTop: 4,
  },
  helloCompact: {
    marginTop: 0,
  },
  hello: {
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  helloName: {
    color: ui.champagne,
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  dateBlock: {
    marginTop: 16,
    gap: 2,
  },
  kicker: {
    color: ui.champagne,
    fontFamily: fonts.display,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  date: {
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.6,
  },
  weekday: {
    color: ui.text,
    fontFamily: fonts.displayLight,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 1.2,
  },
  progressRow: {
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  progressStacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  hero: {
    flexShrink: 0,
  },
  figure: {
    color: ui.text,
    fontFamily: fonts.textLight,
    fontSize: 48,
    lineHeight: 50,
    letterSpacing: -1,
  },
  figureCompact: {
    fontSize: 40,
    lineHeight: 42,
  },
  figureMark: {
    fontFamily: fonts.textLight,
    fontSize: 30,
    lineHeight: 30,
    letterSpacing: 0,
  },
  figureMarkCompact: {
    fontSize: 24,
    lineHeight: 24,
  },
  figureLabel: {
    color: ui.textChampagne,
    fontFamily: fonts.display,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  meter: {
    flex: 1,
    minWidth: 0,
    paddingBottom: 6,
  },
  pillars: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },
  quote: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingRight: 8,
  },
  quoteMark: {
    color: ui.champagne,
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 34,
  },
  quoteRule: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(232, 201, 155, 0.45)',
    marginTop: 6,
    marginBottom: 4,
  },
  quoteText: {
    flex: 1,
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.2,
    paddingTop: 8,
  },
  button: {
    marginTop: 18,
    minHeight: 52,
    borderRadius: 999,
    backgroundColor: '#E7C99A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  buttonLabel: {
    color: '#1A140E',
    fontFamily: fonts.textMedium,
    fontSize: 14,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  pressed: {
    opacity: 0.86,
  },
});
