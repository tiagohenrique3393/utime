import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState, useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { DayProgress } from '@/components/day-progress';
import { HabitGlyph } from '@/components/habit-glyph';
import { HojePlanet } from '@/components/hoje-planet';
import { HomeHydration } from '@/components/home-hydration';
import { PillarCard } from '@/components/pillar-card';
import { fonts, ui } from '@/constants/theme';
import { dailyCounts, habitsForScore, isDailyHabitDone, pillarDailyPercent } from '@/lib/daily-board';
import { useDailyBoard } from '@/lib/use-daily-board';
import { formatDailyPercent, todayKey } from '@/lib/habit-day';
import { greetingParts, homeDateParts } from '@/lib/home-copy';
import { habitIconFor, periodCopy } from '@/lib/habit-visual';
import { pillarLabels } from '@/lib/habit-catalog';
import { nextScheduledHabit } from '@/lib/next-habit';
import { getProfileSnapshot, subscribeProfile } from '@/lib/profile';
import { useRequireSession } from '@/lib/require-session';
import { getSessionUserId } from '@/lib/accounts';
import { weeklyPhrase } from '@/lib/weekly-phrase';

export default function TodayScreen() {
  const signedIn = useRequireSession();
  const { height, width } = useWindowDimensions();
  const compact = height < 740 || width < 360;
  const stacked = width < 340;
  const profile = useSyncExternalStore(subscribeProfile, getProfileSnapshot, getProfileSnapshot);
  const board = useDailyBoard();
  const [now, setNow] = useState<Date | null>(null);
  const userId = getSessionUserId();

  useFocusEffect(
    useCallback(() => {
      setNow(new Date());
    }, []),
  );

  const scored = habitsForScore(board.habits);
  const counts = dailyCounts(scored, board.completed);
  const percent = counts.percent;
  const pillars = (['corpo', 'mente', 'espirito'] as const).map((id) => ({
    id,
    label: pillarLabels[id],
    percent: pillarDailyPercent(scored, board.completed, id),
  }));
  const hello = now ? greetingParts(now, profile.firstName) : { hello: '', name: '' };
  const phraseKey = board.dateKey || (now ? todayKey(now) : '');
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
    ? 'Todos os hábitos concluídos'
    : noneScheduled
      ? 'Nenhum hábito programado hoje'
      : nextHabit?.label ?? '';
  const habitDetail = nextHabit
    ? [periodCopy[nextHabit.period].title, nextHabit.minutes ? `${nextHabit.minutes} min` : '']
        .filter(Boolean)
        .join(' · ')
    : '';
  const habitIcon = nextHabit
    ? habitIconFor(nextHabit.label, board.habits.find((habit) => habit.id === nextHabit.id)?.catalogHabitId)
    : 'spark';

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
            style={[styles.figure, compact && styles.figureCompact]}
            accessibilityLabel={`${formatDailyPercent(percent)} do seu dia`}>
            {formatDailyPercent(percent)}
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

      <View style={styles.habit} accessibilityRole="text">
        <View style={styles.habitCopy}>
          <Text style={styles.habitKicker}>Próximo hábito</Text>
          {habitTitle ? (
            <Text style={styles.habitTitle} numberOfLines={2}>
              {habitTitle}
            </Text>
          ) : null}
          {habitDetail ? <Text style={styles.habitDetail}>{habitDetail}</Text> : null}
        </View>
        <View style={styles.habitIcon}>
          <HabitGlyph name={habitIcon} color={ui.champagne} size={22} />
        </View>
      </View>

      <HomeHydration userId={userId} dateKey={phraseKey} />

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
    width: 132,
  },
  figure: {
    color: ui.text,
    fontFamily: fonts.textLight,
    fontSize: 48,
    lineHeight: 50,
    letterSpacing: -1,
  },
  figureCompact: {
    fontSize: 44,
    lineHeight: 46,
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
  habit: {
    marginTop: 14,
    minHeight: 84,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(232, 201, 155, 0.38)',
    backgroundColor: 'rgba(12, 11, 10, 0.82)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 12,
    paddingVertical: 12,
    gap: 12,
  },
  habitCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  habitKicker: {
    color: ui.champagne,
    fontFamily: fonts.display,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  habitTitle: {
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  habitDetail: {
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  habitIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(232, 201, 155, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232, 201, 155, 0.06)',
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
    letterSpacing: 0.6,
    textTransform: 'uppercase',
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
