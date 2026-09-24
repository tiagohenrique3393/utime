import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts } from '@/constants/theme';
import {
  completedIdsForDay,
  isDayUnlocked,
  markDayStarted,
  periods,
  progressPercent,
  toggleDayTask,
  useJourneyBoard,
} from '@/lib/tasks';

function formatToday(date: Date) {
  const formatted = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function parseDay(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const day = Number(raw);
  if (!Number.isInteger(day) || day < 1 || day > 30) {
    return 1;
  }
  return day;
}

function goHome() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace('/inicio');
}

export default function JourneyScreen() {
  const params = useLocalSearchParams<{ dia?: string }>();
  const day = parseDay(params.dia);
  const { width } = useWindowDimensions();
  const isWide = width >= 700;
  const journey = useJourneyBoard();
  const unlocked = isDayUnlocked(day, journey.testMode);
  const completed = completedIdsForDay(journey, day);
  const completedSet = new Set(completed);
  const percent = progressPercent(completed.length);
  const [today, setToday] = useState('');

  useEffect(() => {
    setToday(formatToday(new Date()));
  }, []);

  useEffect(() => {
    if (!unlocked) {
      router.replace('/trinta-dias' as Href);
      return;
    }
    markDayStarted(day);
  }, [day, unlocked]);

  if (!unlocked) {
    return <View style={styles.screen} />;
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={[styles.safe, isWide && styles.safeWide]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={[styles.column, isWide && styles.columnWide]}>
            <Pressable accessibilityRole="button" onPress={goHome} style={styles.back}>
              <Text style={styles.backLabel}>Voltar</Text>
            </Pressable>

            <Text style={styles.eyebrow}>Minha jornada</Text>
            <Text accessibilityRole="header" style={styles.title}>
              Dia {day} de 30
            </Text>
            {day === 1 ? <Text style={styles.date}>{today}</Text> : <View style={styles.date} />}

            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>Progresso diário</Text>
                <Text style={styles.progressValue}>{percent}%</Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${percent}%` }]} />
              </View>
            </View>

            <View style={[styles.periods, isWide && styles.periodsWide]}>
              {periods.map((period) => (
                <View key={period.id} style={[styles.period, isWide && styles.periodWide]}>
                  <Text style={styles.periodTitle}>{period.title}</Text>
                  <View style={styles.taskList}>
                    {period.tasks.map((task, index) => {
                      const checked = completedSet.has(task.id);
                      return (
                        <Pressable
                          key={task.id}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked }}
                          onPress={() => toggleDayTask(day, task.id)}
                          style={({ pressed }) => [
                            styles.task,
                            checked && styles.taskChecked,
                            pressed && styles.pressed,
                          ]}>
                          <Text style={styles.taskIndex}>{index + 1}</Text>
                          <Text style={styles.taskLabel}>{task.label}</Text>
                          <View style={[styles.box, checked && styles.boxChecked]}>
                            {checked ? <View style={styles.tick} /> : null}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={goHome}
              style={({ pressed }) => [styles.homeButton, pressed && styles.pressed]}>
              <Text style={styles.homeButtonLabel}>Voltar à página inicial</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
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
    paddingBottom: 32,
  },
  column: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  columnWide: {
    maxWidth: 980,
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
  date: {
    minHeight: 22,
    marginTop: 8,
    color: colors.muted,
    fontFamily: fonts.text,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  progressCard: {
    marginTop: 24,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  progressTitle: {
    color: colors.muted,
    fontFamily: fonts.text,
    fontSize: 14,
  },
  progressValue: {
    color: colors.ivory,
    fontFamily: fonts.text,
    fontSize: 14,
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(244, 240, 232, 0.08)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.gold,
  },
  periods: {
    marginTop: 28,
    gap: 26,
  },
  periodsWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  period: {
    gap: 12,
  },
  periodWide: {
    flex: 1,
  },
  periodTitle: {
    color: colors.gold,
    fontFamily: fonts.text,
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  taskList: {
    gap: 8,
  },
  task: {
    minHeight: 58,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  taskChecked: {
    borderColor: colors.gold,
  },
  taskIndex: {
    width: 16,
    color: colors.muted,
    fontFamily: fonts.text,
    fontSize: 13,
    textAlign: 'center',
  },
  taskLabel: {
    flex: 1,
    color: colors.ivory,
    fontFamily: fonts.text,
    fontSize: 15,
    lineHeight: 21,
  },
  box: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.iconBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  tick: {
    width: 8,
    height: 5,
    marginTop: -2,
    borderLeftWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: colors.background,
    transform: [{ rotate: '-45deg' }],
  },
  homeButton: {
    height: 58,
    marginTop: 28,
    borderRadius: 16,
    backgroundColor: colors.ivory,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  homeButtonLabel: {
    color: colors.background,
    fontFamily: fonts.text,
    fontSize: 16,
    letterSpacing: 0.2,
  },
  pressed: {
    opacity: 0.84,
  },
});
