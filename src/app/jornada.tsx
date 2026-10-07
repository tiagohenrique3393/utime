import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { AppScreen, Eyebrow, TextButton, Track } from '@/components/app-screen';
import { fonts, ui } from '@/constants/theme';
import { useRequireSession } from '@/lib/require-session';
import {
  completedIdsForDay,
  isDayUnlocked,
  markDayStarted,
  periods,
  progressPercent,
  TASK_TOTAL,
  toggleDayTask,
  useJourneyBoard,
} from '@/lib/tasks';

function parseDay(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const day = Number(raw);
  if (!Number.isInteger(day) || day < 1 || day > 30) {
    return 1;
  }
  return day;
}

export default function RoutineScreen() {
  const signedIn = useRequireSession();
  const params = useLocalSearchParams<{ dia?: string }>();
  const day = parseDay(params.dia);
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const journey = useJourneyBoard();
  const unlocked = isDayUnlocked(day, journey.testMode, journey);
  const completed = completedIdsForDay(journey, day);
  const completedSet = new Set(completed);
  const done = completed.length;
  const percent = progressPercent(done);

  useEffect(() => {
    if (!signedIn) {
      return;
    }
    if (!unlocked) {
      router.replace('/trinta-dias' as Href);
      return;
    }
    markDayStarted(day);
  }, [day, signedIn, unlocked]);

  if (!signedIn || !unlocked) {
    return <View style={styles.blank} />;
  }

  return (
    <AppScreen>
      <TextButton label="Hoje" onPress={() => router.navigate('/inicio')} />
      <View style={styles.header}>
        <Eyebrow>Hoje</Eyebrow>
        <Text style={styles.count}>
          {done} de {TASK_TOTAL} concluídos
        </Text>
        <Text style={styles.day}>Dia {day} da jornada</Text>
      </View>
      <Track percent={percent} />

      <View style={[styles.periods, wide && styles.periodsWide]}>
        {periods.map((period) => (
          <View key={period.id} style={[styles.period, wide && styles.periodWide]}>
            <Text style={styles.periodTitle}>{period.title}</Text>
            {period.tasks.map((task) => {
              const checked = completedSet.has(task.id);
              return (
                <Pressable
                  key={task.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                  accessibilityLabel={task.label}
                  onPress={() => toggleDayTask(day, task.id)}
                  style={({ pressed }) => [styles.task, pressed && styles.pressed]}>
                  <View style={styles.copy}>
                    <Text style={[styles.taskLabel, checked && styles.taskDone]}>{task.label}</Text>
                    <Text style={styles.state}>{checked ? 'Concluído' : period.title}</Text>
                  </View>
                  <View style={[styles.mark, checked && styles.markOn]} />
                </Pressable>
              );
            })}
          </View>
        ))}
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
    marginBottom: 18,
    gap: 8,
  },
  count: {
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  day: {
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 13,
    letterSpacing: 0.4,
  },
  periods: {
    marginTop: 28,
    gap: 28,
  },
  periodsWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 22,
  },
  period: {
    gap: 0,
  },
  periodWide: {
    flex: 1,
  },
  periodTitle: {
    marginBottom: 6,
    color: ui.champagne,
    fontFamily: fonts.text,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  task: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: ui.lineSoft,
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  taskLabel: {
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 16,
    lineHeight: 21,
  },
  taskDone: {
    color: ui.champagne,
  },
  state: {
    color: ui.faint,
    fontFamily: fonts.text,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  mark: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: ui.line,
  },
  markOn: {
    backgroundColor: ui.champagne,
    borderColor: ui.champagne,
  },
  pressed: {
    opacity: 0.72,
  },
});
