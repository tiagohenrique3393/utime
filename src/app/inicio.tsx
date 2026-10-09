import { router, type Href } from 'expo-router';
import { createElement, useEffect, useState } from 'react';
import { useSyncExternalStore } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View, type TextStyle } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { DayProgress } from '@/components/day-progress';
import { HojePlanet } from '@/components/hoje-planet';
import { PillarCard } from '@/components/pillar-card';
import { fonts, ui } from '@/constants/theme';
import { dailyCounts, pillarDailyPercent } from '@/lib/daily-board';
import { useDailyBoard } from '@/lib/use-daily-board';
import { formatDailyPercent, formatLongDate, zonedHour } from '@/lib/habit-day';
import { pillarLabels } from '@/lib/habit-catalog';
import { getProfileSnapshot, subscribeProfile } from '@/lib/profile';
import { useRequireSession } from '@/lib/require-session';

function greeting(date: Date, name: string) {
  const hour = zonedHour(date);
  const hello = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const first = name.trim().split(/\s+/)[0];
  return first ? `${hello}, ${first}` : hello;
}

function dayMessage(percent: number) {
  if (percent >= 100) {
    return 'Dia concluído.';
  }
  if (percent >= 70) {
    return 'Bom rendimento. Você está quase lá.';
  }
  if (percent >= 40) {
    return 'Você está avançando. Continue.';
  }
  return 'Seu dia ainda está começando';
}

function remainingLine(count: number) {
  if (count === 1) {
    return '1 hábito ainda te espera hoje';
  }
  return `${count} hábitos ainda te esperam hoje`;
}

function Trophy() {
  if (Platform.OS !== 'web') {
    return <View style={styles.trophyFallback} />;
  }
  return createElement(
    'svg',
    { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
    createElement('path', {
      d: 'M5.2 2.4h5.6v2.2c0 1.7-1.1 2.9-2.4 3.2v1.5h1.7v1.2H5.9v-1.2h1.7V7.8C6.3 7.5 5.2 6.3 5.2 4.6V2.4z',
      stroke: ui.champagne,
      strokeWidth: 1.15,
      strokeLinejoin: 'round',
    }),
    createElement('path', {
      d: 'M5.2 3.2H3.3c.2 1.5.9 2.3 2.1 2.6M10.8 3.2h1.9c-.2 1.5-.9 2.3-2.1 2.6',
      stroke: ui.champagne,
      strokeWidth: 1.15,
      strokeLinecap: 'round',
    }),
  );
}

const lineStyle: TextStyle | undefined =
  Platform.OS === 'web' ? ({ whiteSpace: 'nowrap' } as TextStyle) : undefined;

function Chevron() {
  if (Platform.OS !== 'web') {
    return <Text style={styles.chevronFallback}>›</Text>;
  }
  return createElement(
    'svg',
    { width: 14, height: 14, viewBox: '0 0 14 14', fill: 'none', 'aria-hidden': true },
    createElement('path', {
      d: 'M5 2.5 L9.5 7 L5 11.5',
      stroke: ui.ink,
      strokeWidth: 1.4,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    }),
  );
}

export default function TodayScreen() {
  const signedIn = useRequireSession();
  const { height, width } = useWindowDimensions();
  const compact = height < 740;
  const statusSize = width < 360 ? 7.5 : width < 420 ? 8 : width < 760 ? 10 : 12;
  const profile = useSyncExternalStore(subscribeProfile, getProfileSnapshot, getProfileSnapshot);
  const board = useDailyBoard();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
  }, []);

  const counts = dailyCounts(board.habits, board.completed);
  const done = counts.done;
  const percent = counts.percent;
  const remaining = Math.max(0, counts.total - done);
  const pillars = (['corpo', 'mente', 'espirito'] as const).map((id) => ({
    id,
    label: pillarLabels[id],
    percent: pillarDailyPercent(board.habits, board.completed, id),
  }));
  const hello = now ? greeting(now, profile.firstName) : '';
  const dateLine = board.dateKey ? formatLongDate(board.dateKey) : '';
  const closed = percent >= 100;
  const feminine = profile.journey === 'womantime';

  if (!signedIn) {
    return <View style={styles.blocked} />;
  }

  return (
    <AppScreen width="stage" backdrop={<HojePlanet />} navVariant="hoje">
      <Text accessibilityRole="header" style={styles.hello}>
        {hello}
      </Text>

      <View style={styles.dateBlock}>
        <Text style={styles.kicker}>Hoje</Text>
        {dateLine ? <Text style={styles.date}>{dateLine}</Text> : null}
      </View>

      <Text style={[styles.figure, compact && styles.figureCompact]} accessibilityLabel={`${formatDailyPercent(percent)} do seu dia`}>
        {formatDailyPercent(percent)}
      </Text>
      <Text style={styles.figureLabel}>Seu dia</Text>
      <View style={styles.track}>
        <DayProgress percent={percent} />
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

      <View style={styles.status}>
        <View style={styles.statusRule} />
        <Trophy />
        <Text style={[styles.message, lineStyle, { fontSize: statusSize, lineHeight: statusSize + 3 }]}>
          {dayMessage(percent)}
        </Text>
        {closed || remaining > 0 ? <View style={styles.statusSplit} /> : null}
        {closed ? (
          <Text style={[styles.counter, lineStyle, { fontSize: statusSize, lineHeight: statusSize + 3 }]}>
            Você cumpriu tudo o que planejou para hoje.
          </Text>
        ) : remaining > 0 ? (
          <Text style={[styles.counter, lineStyle, { fontSize: statusSize, lineHeight: statusSize + 3 }]}>
            {remainingLine(remaining)}
          </Text>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/meu-dia' as Href)}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <Text style={styles.buttonLabel}>Ver meu dia</Text>
        <Chevron />
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  blocked: {
    flex: 1,
    backgroundColor: ui.background,
  },
  hello: {
    color: ui.text,
    fontFamily: fonts.displayLight,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: 4.2,
    textTransform: 'uppercase',
  },
  dateBlock: {
    marginTop: 26,
    gap: 4,
  },
  kicker: {
    color: ui.champagne,
    fontFamily: fonts.displayLight,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 2.6,
    textTransform: 'uppercase',
  },
  date: {
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    paddingRight: 2,
  },
  figure: {
    marginTop: 26,
    color: ui.text,
    fontFamily: fonts.textLight,
    fontSize: 62,
    lineHeight: 64,
    letterSpacing: -0.6,
  },
  figureCompact: {
    marginTop: 18,
    fontSize: 48,
    lineHeight: 50,
  },
  figureLabel: {
    marginTop: 2,
    color: ui.champagne,
    fontFamily: fonts.displayLight,
    fontSize: 12,
    letterSpacing: 2.8,
    textTransform: 'uppercase',
  },
  track: {
    marginTop: 14,
    width: '100%',
    maxWidth: 360,
  },
  pillars: {
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },
  status: {
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: 6,
    minHeight: 42,
    paddingVertical: 9,
    paddingRight: 8,
    paddingLeft: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(243, 239, 232, 0.08)',
    backgroundColor: 'rgba(16, 14, 13, 0.78)',
  },
  statusRule: {
    width: 2,
    height: 18,
    borderRadius: 1,
    backgroundColor: ui.champagne,
    opacity: 0.9,
  },
  trophyFallback: {
    width: 12,
    height: 12,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: ui.champagne,
  },
  statusSplit: {
    width: 1,
    height: 14,
    backgroundColor: 'rgba(243, 239, 232, 0.28)',
  },
  message: {
    flexGrow: 0,
    flexShrink: 0,
    color: ui.text,
    fontFamily: fonts.text,
    letterSpacing: 0.15,
    textTransform: 'uppercase',
  },
  counter: {
    flexGrow: 0,
    flexShrink: 0,
    color: ui.muted,
    fontFamily: fonts.text,
    letterSpacing: 0.1,
    textTransform: 'uppercase',
  },
  button: {
    marginTop: 16,
    minHeight: 52,
    borderRadius: 999,
    backgroundColor: ui.champagne,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 22,
  },
  buttonLabel: {
    color: ui.ink,
    fontFamily: fonts.textMedium,
    fontSize: 13,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  chevronFallback: {
    color: ui.ink,
    fontSize: 18,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.84,
  },
});
