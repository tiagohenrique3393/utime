import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { useSyncExternalStore } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { AppScreen, Eyebrow, Meta, PrimaryButton, Track } from '@/components/app-screen';
import { fonts, ui } from '@/constants/theme';
import { currentJourneyDay, dayPillars, upcomingHabits } from '@/lib/journey-view';
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

function remainingCopy(count: number) {
  if (count <= 0) {
    return 'O dia está fechado.';
  }
  if (count === 1) {
    return 'Falta 1 hábito para fechar o dia.';
  }
  return `Faltam ${count} hábitos para fechar o dia.`;
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
  const pillars = dayPillars(journey, day);
  const next = upcomingHabits(journey, day, 3);
  const hello = now ? greeting(now, profile.firstName) : 'Olá';
  const dateLine = now ? todayLabel(now) : '';

  return (
    <AppScreen width="narrow">
      <Text accessibilityRole="header" style={[styles.hello, compact && styles.helloCompact]}>
        {hello}
      </Text>
      <View style={styles.dateBlock}>
        <Eyebrow>Hoje</Eyebrow>
        {dateLine ? <Meta style={styles.date}>{dateLine}</Meta> : null}
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

      <Text style={styles.section}>Próximos hábitos</Text>
      {next.length === 0 ? (
        <Meta style={styles.empty}>Nenhum hábito pendente hoje.</Meta>
      ) : (
        <View style={styles.list}>
          {next.map((habit) => (
            <View key={habit.id} style={styles.habit}>
              <Text style={styles.habitName}>{habit.label}</Text>
              <Text style={styles.habitPeriod}>{habit.period}</Text>
            </View>
          ))}
        </View>
      )}

      <Meta style={styles.remaining}>{remainingCopy(TASK_TOTAL - done)}</Meta>

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
    fontSize: 36,
    lineHeight: 40,
  },
  helloCompact: {
    fontSize: 30,
    lineHeight: 34,
  },
  dateBlock: {
    marginTop: 28,
    gap: 6,
  },
  date: {
    textTransform: 'capitalize',
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
  section: {
    marginTop: 40,
    color: ui.champagne,
    fontFamily: fonts.text,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  list: {
    marginTop: 8,
  },
  habit: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: ui.lineSoft,
  },
  habitName: {
    flex: 1,
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 15,
    lineHeight: 20,
  },
  habitPeriod: {
    color: ui.faint,
    fontFamily: fonts.text,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  empty: {
    marginTop: 12,
  },
  remaining: {
    marginTop: 22,
  },
  action: {
    marginTop: 28,
  },
});
