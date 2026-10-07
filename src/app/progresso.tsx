import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen, Eyebrow, Meta, TextButton } from '@/components/app-screen';
import { EvolutionChart } from '@/components/evolution-chart';
import { useReducedMotion, useSettledNumbers } from '@/components/motion';
import { fonts, ui } from '@/constants/theme';
import { currentJourneyDay, dayPillars, evolutionSeries, type ChartPeriod } from '@/lib/journey-view';
import { utimeScore } from '@/lib/score';
import { getSessionUserId } from '@/lib/accounts';
import { useJourneyBoard } from '@/lib/tasks';

const periods: { id: ChartPeriod; label: string }[] = [
  { id: '10', label: '10 dias' },
  { id: '30', label: '30 dias' },
  { id: 'mes', label: 'Mês' },
];

export default function ProgressScreen() {
  const signedIn = getSessionUserId() !== null;
  const journey = useJourneyBoard();
  const reduced = useReducedMotion();
  const [period, setPeriod] = useState<ChartPeriod>('30');
  const [today, setToday] = useState<Date | null>(null);
  const score = utimeScore(journey);
  const [shownScore] = useSettledNumbers([score], reduced);
  const pillars = dayPillars(journey, currentJourneyDay(journey));
  const points = today ? evolutionSeries(journey, period, today) : [];

  useEffect(() => {
    if (!getSessionUserId()) {
      router.replace('/');
    }
  }, []);

  useEffect(() => {
    setToday(new Date());
  }, []);

  if (!signedIn) {
    return <View style={styles.blank} />;
  }

  return (
    <AppScreen>
      <TextButton label="Jornada" onPress={() => router.navigate('/trinta-dias')} />
      <View style={styles.header}>
        <Eyebrow>Progresso</Eyebrow>
        <Text accessibilityRole="header" style={styles.score}>
          {Math.round(shownScore ?? score)}
        </Text>
        <Text style={styles.scoreLabel}>UTime Score</Text>
        <Meta style={styles.note}>Pontos de constância. A porcentagem abaixo é a conclusão de cada dia.</Meta>
      </View>

      <View style={styles.pillars}>
        {pillars.map((pillar) => (
          <View key={pillar.id} style={styles.pillar} accessibilityLabel={`${pillar.label} ${pillar.percent}%`}>
            <Text style={styles.pillarName}>{pillar.label}</Text>
            <Text style={styles.pillarValue}>{pillar.percent}%</Text>
          </View>
        ))}
      </View>

      <Text style={styles.section}>Evolução</Text>
      <View style={styles.periods}>
        {periods.map((item) => {
          const selected = item.id === period;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setPeriod(item.id)}
              style={styles.period}>
              <Text style={[styles.periodLabel, selected && styles.periodSelected]}>{item.label}</Text>
              <View style={[styles.periodMark, selected && styles.periodMarkOn]} />
            </Pressable>
          );
        })}
      </View>
      <View style={styles.chart}>
        <EvolutionChart points={points} />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  blank: {
    flex: 1,
    backgroundColor: ui.background,
  },
  header: {
    marginTop: 18,
  },
  score: {
    marginTop: 12,
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 72,
    lineHeight: 76,
  },
  scoreLabel: {
    color: ui.champagne,
    fontFamily: fonts.text,
    fontSize: 12,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  note: {
    marginTop: 12,
    maxWidth: 360,
  },
  pillars: {
    marginTop: 32,
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
    letterSpacing: 1.4,
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
  periods: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 18,
  },
  period: {
    minHeight: 44,
    justifyContent: 'center',
  },
  periodLabel: {
    color: ui.faint,
    fontFamily: fonts.text,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  periodSelected: {
    color: ui.text,
  },
  periodMark: {
    marginTop: 6,
    height: 1,
    backgroundColor: 'transparent',
  },
  periodMarkOn: {
    backgroundColor: ui.champagne,
  },
  chart: {
    marginTop: 8,
  },
});
