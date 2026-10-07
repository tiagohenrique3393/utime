import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { useSyncExternalStore } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { AppScreen, Eyebrow, PrimaryButton, Track } from '@/components/app-screen';
import { fonts, ui } from '@/constants/theme';
import { currentJourneyDay, dayPillars } from '@/lib/journey-view';
import { getProfileSnapshot, subscribeProfile } from '@/lib/profile';
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

export default function TodayScreen() {
  const { height } = useWindowDimensions();
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

  return (
    <AppScreen width="narrow">
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
        <Track percent={percent} />
      </View>

      <View style={styles.pillars}>
        {pillars.map((pillar) => (
          <View key={pillar.id} style={styles.pillar} accessibilityLabel={`${pillar.label} ${pillar.percent}%`}>
            <Text style={styles.pillarName}>{pillar.label}</Text>
            <Text style={styles.pillarValue}>{pillar.percent}%</Text>
          </View>
        ))}
      </View>

      <View style={styles.summary}>
        <Text style={styles.message}>{dayMessage(percent)}</Text>
        {closed ? (
          <Text style={styles.closed}>Você cumpriu tudo o que planejou para hoje.</Text>
        ) : remaining > 0 ? (
          <Text style={styles.counter}>{remainingLine(remaining)}</Text>
        ) : null}
      </View>

      <View style={styles.action}>
        <PrimaryButton label="Ver meu dia" onPress={() => router.push(`/jornada?dia=${day}` as Href)} />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hello: {
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    paddingRight: 4,
  },
  dateBlock: {
    marginTop: 28,
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
    marginTop: 36,
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 64,
    lineHeight: 68,
  },
  figureCompact: {
    marginTop: 24,
    fontSize: 52,
    lineHeight: 56,
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
    marginTop: 16,
    width: '72%',
    maxWidth: 220,
  },
  pillars: {
    marginTop: 36,
    flexDirection: 'row',
  },
  pillar: {
    flex: 1,
    gap: 4,
  },
  pillarName: {
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  pillarValue: {
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 26,
    lineHeight: 30,
  },
  summary: {
    marginTop: 40,
    gap: 10,
    maxWidth: '100%',
  },
  message: {
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: 1.15,
    textTransform: 'uppercase',
    paddingRight: 2,
  },
  counter: {
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  closed: {
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  action: {
    marginTop: 28,
  },
});
