import { router, type Href } from 'expo-router';
import { createElement, useEffect, useState } from 'react';
import { useSyncExternalStore } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { AppScreen, Eyebrow } from '@/components/app-screen';
import { DayProgress } from '@/components/day-progress';
import { HojePlanet } from '@/components/hoje-planet';
import { PillarCard } from '@/components/pillar-card';
import { fonts, ui } from '@/constants/theme';
import { currentJourneyDay, dayPillars } from '@/lib/journey-view';
import { getProfileSnapshot, subscribeProfile } from '@/lib/profile';
import { useRequireSession } from '@/lib/require-session';
import { completedIdsForDay, progressPercent, TASK_TOTAL, useJourneyBoard } from '@/lib/tasks';

function greeting(date: Date, name: string) {
  const hour = date.getHours();
  const hello = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const first = name.trim().split(/\s+/)[0];
  return first ? `${hello}, ${first}` : hello;
}

function todayLabel(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' }).format(date);
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
  const { width, height } = useWindowDimensions();
  const compact = height < 740;
  const profile = useSyncExternalStore(subscribeProfile, getProfileSnapshot, getProfileSnapshot);
  const journey = useJourneyBoard();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
  }, []);

  const day = currentJourneyDay(journey);
  const done = completedIdsForDay(journey, day).length;
  const percent = progressPercent(done);
  const remaining = Math.max(0, TASK_TOTAL - done);
  const pillars = dayPillars(journey, day);
  const hello = now ? greeting(now, profile.firstName) : '';
  const dateLine = now ? todayLabel(now) : '';
  const closed = percent >= 100;
  const stacked = width < 760;

  if (!signedIn) {
    return <View style={styles.blocked} />;
  }

  return (
    <AppScreen width="stage" backdrop={<HojePlanet />} navVariant="hoje">
      <Text accessibilityRole="header" style={styles.hello}>
        {hello}
      </Text>

      <View style={styles.dateBlock}>
        <Eyebrow>Hoje</Eyebrow>
        {dateLine ? <Text style={styles.date}>{dateLine}</Text> : null}
      </View>

      <Text style={[styles.figure, compact && styles.figureCompact]} accessibilityLabel={`${percent}% do seu dia`}>
        {percent}%
      </Text>
      <Text style={styles.figureLabel}>Seu dia</Text>
      <View style={styles.track}>
        <DayProgress percent={percent} />
      </View>

      <View style={[styles.pillars, stacked && styles.pillarsStacked]}>
        {pillars.map((pillar) => (
          <PillarCard key={pillar.id} id={pillar.id} label={pillar.label} percent={pillar.percent} stacked={stacked} />
        ))}
      </View>

      <View style={styles.status}>
        <View style={styles.statusRule} />
        <View style={styles.statusCopy}>
          <Text style={styles.message}>{dayMessage(percent)}</Text>
          {closed ? (
            <Text style={styles.closed}>Você cumpriu tudo o que planejou para hoje.</Text>
          ) : remaining > 0 ? (
            <Text style={styles.counter}>{remainingLine(remaining)}</Text>
          ) : null}
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(`/jornada?dia=${day}` as Href)}
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
    fontFamily: fonts.display,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: 3.2,
    textTransform: 'uppercase',
  },
  dateBlock: {
    marginTop: 22,
    gap: 6,
  },
  date: {
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    paddingRight: 2,
  },
  figure: {
    marginTop: 28,
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 52,
    lineHeight: 56,
    letterSpacing: 0.6,
  },
  figureCompact: {
    marginTop: 20,
    fontSize: 44,
    lineHeight: 48,
  },
  figureLabel: {
    marginTop: 4,
    color: ui.champagne,
    fontFamily: fonts.text,
    fontSize: 12,
    letterSpacing: 2.2,
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
    gap: 14,
  },
  pillarsStacked: {
    flexDirection: 'column',
    gap: 12,
  },
  status: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    paddingVertical: 16,
    paddingRight: 16,
    paddingLeft: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(243, 239, 232, 0.08)',
    backgroundColor: 'rgba(16, 14, 13, 0.78)',
  },
  statusRule: {
    width: 2,
    borderRadius: 1,
    backgroundColor: ui.champagne,
    opacity: 0.85,
  },
  statusCopy: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  message: {
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  counter: {
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  closed: {
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  button: {
    marginTop: 18,
    minHeight: 56,
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
    fontFamily: fonts.text,
    fontSize: 13,
    letterSpacing: 1.6,
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
