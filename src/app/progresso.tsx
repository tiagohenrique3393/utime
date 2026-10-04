import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '@/components/bottom-nav';
import { colors, fonts } from '@/constants/theme';
import { getSessionUserId } from '@/lib/accounts';
import {
  DAY_COUNT,
  completedDayCount,
  dayProgress,
  overallProgress,
  useJourneyBoard,
  type JourneyBoard,
} from '@/lib/tasks';

const weeks = [
  { title: 'Semana 1', range: 'Dias 1 a 7', days: [1, 2, 3, 4, 5, 6, 7] },
  { title: 'Semana 2', range: 'Dias 8 a 14', days: [8, 9, 10, 11, 12, 13, 14] },
  { title: 'Semana 3', range: 'Dias 15 a 21', days: [15, 16, 17, 18, 19, 20, 21] },
  { title: 'Semana 4', range: 'Dias 22 a 28', days: [22, 23, 24, 25, 26, 27, 28] },
  { title: 'Semana 5', range: 'Dias 29 a 30', days: [29, 30] },
] as const;

const CHART_HEIGHT = 128;
const days = Array.from({ length: DAY_COUNT }, (_, index) => index + 1);

function formatOverallPercent(value: number) {
  const rounded = Math.round(value * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace('.', ',');
  return `${text}%`;
}

function averageOfDays(source: JourneyBoard, dayNumbers: readonly number[]) {
  let total = 0;
  for (const day of dayNumbers) {
    total += dayProgress(source, day);
  }
  return Math.round((total / dayNumbers.length) * 10) / 10;
}

export default function ProgressScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 700;
  const signedIn = getSessionUserId() !== null;
  const journey = useJourneyBoard();
  const dayPercents = days.map((day) => dayProgress(journey, day));
  const weekPercents = weeks.map((week) => averageOfDays(journey, week.days));
  const monthly = overallProgress(journey);
  const concluded = completedDayCount(journey);
  const hasProgress = dayPercents.some((percent) => percent > 0);
  const [chosenDay, setChosenDay] = useState<number | null>(null);
  const latestWithProgress = dayPercents.reduce(
    (found, percent, index) => (percent > 0 ? index + 1 : found),
    1,
  );
  const activeDay = chosenDay ?? latestWithProgress;
  const activePercent = dayPercents[activeDay - 1] ?? 0;

  useEffect(() => {
    if (!getSessionUserId()) {
      router.replace('/entrar');
    }
  }, []);

  if (!signedIn) {
    return <View style={styles.screen} />;
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safe, isWide && styles.safeWide]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={[styles.column, isWide && styles.columnWide]}>
            <Pressable
              accessibilityRole="button"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/inicio'))}
              style={styles.back}>
              <Text style={styles.backLabel}>Voltar</Text>
            </Pressable>

            <Text style={styles.eyebrow}>Acompanhamento</Text>
            <Text accessibilityRole="header" style={[styles.title, isWide && styles.titleWide]}>
              Progresso
            </Text>
            <Text style={styles.lead}>Cada dia da jornada, as semanas e a média dos 30 dias.</Text>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Progresso diário</Text>
              <View style={styles.card}>
                {days.map((day, index) => {
                  const percent = dayPercents[index];
                  return (
                    <View
                      key={day}
                      accessibilityLabel={`Dia ${day}, ${percent}%`}
                      style={styles.dayRow}>
                      <Text style={styles.dayLabel}>Dia {day}</Text>
                      <View style={[styles.track, styles.dayTrack]}>
                        <View style={[styles.fill, { width: `${percent}%` }]} />
                      </View>
                      <Text style={styles.dayValue}>{percent}%</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Progresso semanal</Text>
              <View style={styles.card}>
                {weeks.map((week, index) => {
                  const percent = weekPercents[index];
                  return (
                    <View
                      key={week.title}
                      accessibilityLabel={`${week.title}, ${week.range}, ${formatOverallPercent(percent)}`}
                      style={index > 0 ? styles.weekBlock : undefined}>
                      <View style={styles.progressHeader}>
                        <View style={styles.weekCopy}>
                          <Text style={styles.weekTitle}>{week.title}</Text>
                          <Text style={styles.weekRange}>{week.range}</Text>
                        </View>
                        <Text style={styles.progressValue}>{formatOverallPercent(percent)}</Text>
                      </View>
                      <View style={styles.track}>
                        <View style={[styles.fill, { width: `${percent}%` }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Progresso mensal</Text>
              <View style={styles.card}>
                <View style={styles.progressHeader}>
                  <Text style={styles.monthLabel}>Média dos 30 dias</Text>
                  <Text style={styles.progressValue}>{formatOverallPercent(monthly)}</Text>
                </View>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${monthly}%` }]} />
                </View>
                <Text style={styles.count}>{concluded} de 30 dias concluídos</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Gráfico de evolução</Text>
              <View style={styles.card}>
                <View style={styles.progressHeader}>
                  <Text style={styles.weekTitle}>Dia {activeDay}</Text>
                  <Text style={styles.progressValue}>{activePercent}%</Text>
                </View>
                <View style={styles.chartBody}>
                  <View style={styles.yAxis}>
                    <Text style={[styles.yLabel, styles.yLabelTop]}>100%</Text>
                    <Text style={[styles.yLabel, styles.yLabelMid]}>50%</Text>
                    <Text style={[styles.yLabel, styles.yLabelBase]}>0%</Text>
                  </View>
                  <View style={styles.plot}>
                    <View style={styles.guides}>
                      <View style={[styles.guide, styles.guideTop]} />
                      <View style={[styles.guide, styles.guideMid]} />
                      <View style={[styles.guide, styles.guideBase]} />
                    </View>
                    <View style={styles.bars}>
                      {days.map((day, index) => {
                        const percent = dayPercents[index];
                        const height = percent === 0 ? 2 : Math.round((percent / 100) * CHART_HEIGHT);
                        const selected = day === activeDay;
                        return (
                          <Pressable
                            key={day}
                            accessibilityRole="button"
                            accessibilityLabel={`Dia ${day}, ${percent}%`}
                            accessibilityState={{ selected }}
                            onPress={() => setChosenDay(day)}
                            style={[styles.barSlot, selected && styles.barSlotSelected]}>
                            <View
                              style={[
                                styles.bar,
                                percent === 0 ? styles.barEmpty : styles.barFilled,
                                selected && percent === 0 && styles.barSelectedEmpty,
                                { height },
                              ]}
                            />
                            {selected ? <View style={styles.selectedDot} /> : null}
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                </View>
                <View style={styles.chartAxisRow}>
                  <View style={styles.yAxisSpacer} />
                  <View style={styles.chartAxis}>
                    <Text style={styles.axisLabel}>Dia 1</Text>
                    <Text style={styles.axisLabel}>Dia 30</Text>
                  </View>
                </View>
                {hasProgress ? null : (
                  <Text style={styles.emptyNote}>A evolução aparece conforme os dias forem preenchidos.</Text>
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safe: {
    flex: 1,
    paddingHorizontal: 24,
  },
  safeWide: {
    paddingHorizontal: 40,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 8,
    paddingBottom: 28,
  },
  column: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  columnWide: {
    maxWidth: 720,
  },
  back: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  backLabel: {
    color: colors.muted,
    fontFamily: fonts.text,
    fontSize: 14,
    letterSpacing: 0.3,
  },
  eyebrow: {
    marginTop: 12,
    color: colors.gold,
    fontFamily: fonts.text,
    fontSize: 12,
    letterSpacing: 1.4,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 8,
    color: colors.ivory,
    fontFamily: fonts.display,
    fontSize: 40,
    lineHeight: 44,
    textAlign: 'center',
  },
  titleWide: {
    fontSize: 48,
    lineHeight: 52,
  },
  lead: {
    marginTop: 10,
    color: colors.muted,
    fontFamily: fonts.text,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  section: {
    marginTop: 28,
  },
  sectionTitle: {
    marginBottom: 12,
    color: colors.ivory,
    fontFamily: fonts.text,
    fontSize: 16,
    letterSpacing: 0.2,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 7,
  },
  dayLabel: {
    width: 52,
    color: colors.ivory,
    fontFamily: fonts.text,
    fontSize: 14,
  },
  dayTrack: {
    flex: 1,
  },
  dayValue: {
    width: 44,
    color: colors.ivory,
    fontFamily: fonts.text,
    fontSize: 14,
    textAlign: 'right',
  },
  weekBlock: {
    marginTop: 18,
  },
  weekCopy: {
    flex: 1,
    paddingRight: 12,
  },
  weekTitle: {
    color: colors.ivory,
    fontFamily: fonts.text,
    fontSize: 15,
  },
  weekRange: {
    marginTop: 2,
    color: colors.muted,
    fontFamily: fonts.text,
    fontSize: 13,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthLabel: {
    flex: 1,
    color: colors.muted,
    fontFamily: fonts.text,
    fontSize: 14,
    paddingRight: 12,
  },
  progressValue: {
    color: colors.ivory,
    fontFamily: fonts.text,
    fontSize: 14,
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.track,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.gold,
  },
  count: {
    marginTop: 14,
    color: colors.muted,
    fontFamily: fonts.text,
    fontSize: 14,
  },
  chartBody: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  yAxis: {
    width: 36,
    height: CHART_HEIGHT,
    marginRight: 8,
  },
  yAxisSpacer: {
    width: 44,
  },
  yLabel: {
    position: 'absolute',
    right: 0,
    color: colors.muted,
    fontFamily: fonts.text,
    fontSize: 11,
    lineHeight: 14,
  },
  yLabelTop: {
    top: -7,
  },
  yLabelMid: {
    top: CHART_HEIGHT / 2 - 7,
  },
  yLabelBase: {
    bottom: -7,
  },
  plot: {
    flex: 1,
    height: CHART_HEIGHT,
  },
  guides: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  guide: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.track,
  },
  guideTop: {
    top: 0,
  },
  guideMid: {
    top: CHART_HEIGHT / 2,
  },
  guideBase: {
    bottom: 0,
    backgroundColor: colors.line,
  },
  bars: {
    flex: 1,
    height: CHART_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  barSlot: {
    flex: 1,
    height: CHART_HEIGHT,
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderRadius: 3,
  },
  barSlotSelected: {
    backgroundColor: colors.wash,
  },
  bar: {
    width: '70%',
    minWidth: 2,
    maxWidth: 10,
    borderRadius: 2,
  },
  barFilled: {
    backgroundColor: colors.ivory,
  },
  barEmpty: {
    backgroundColor: colors.iconBorder,
  },
  barSelectedEmpty: {
    backgroundColor: colors.ivory,
  },
  selectedDot: {
    position: 'absolute',
    bottom: -10,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.ivory,
  },
  chartAxisRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chartAxis: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  axisLabel: {
    color: colors.muted,
    fontFamily: fonts.text,
    fontSize: 12,
  },
  emptyNote: {
    marginTop: 14,
    color: colors.muted,
    fontFamily: fonts.text,
    fontSize: 14,
    lineHeight: 20,
  },
});
