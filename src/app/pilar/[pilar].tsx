import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen, Eyebrow, TextButton, Track } from '@/components/app-screen';
import { fonts, ui } from '@/constants/theme';
import { dailyPillarBoard, isDailyHabitDone, toggleDailyHabit } from '@/lib/daily-board';
import { useRequireSession } from '@/lib/require-session';
import { pillars, type PillarId } from '@/lib/tasks';
import { useDailyBoard } from '@/lib/use-daily-board';

function isPillarId(value: string): value is PillarId {
  return pillars.some((pillar) => pillar.id === value);
}

export default function PillarScreen() {
  const signedIn = useRequireSession();
  const params = useLocalSearchParams<{ pilar?: string }>();
  const raw = Array.isArray(params.pilar) ? params.pilar[0] : params.pilar;
  const pillar = raw && isPillarId(raw) ? pillars.find((item) => item.id === raw) : undefined;
  const board = useDailyBoard();
  const stats = pillar ? dailyPillarBoard(board.habits, board.completed).find((item) => item.id === pillar.id) : undefined;
  const habits = pillar ? board.habits.filter((habit) => habit.pillar === pillar.id) : [];

  useEffect(() => {
    if (!signedIn || pillar) {
      return;
    }
    router.replace('/inicio');
  }, [pillar, signedIn]);

  if (!signedIn || !pillar) {
    return <View style={styles.blank} />;
  }

  return (
    <AppScreen width="narrow">
      <TextButton label="Hoje" onPress={() => (router.canGoBack() ? router.back() : router.replace('/inicio'))} />
      <View style={styles.header}>
        <Eyebrow>Pilar</Eyebrow>
        <Text accessibilityRole="header" style={styles.title}>
          {pillar.label}
        </Text>
        <Text style={styles.explanation}>{pillar.text}</Text>
      </View>
      <Track percent={stats?.percent ?? 0} />
      <Text style={styles.count}>
        {stats?.done ?? 0} de {stats?.planned ?? 0} · {Math.round(stats?.percent ?? 0)}%
      </Text>

      <View style={styles.list}>
        {habits.map((habit) => {
          const checked = isDailyHabitDone(habit, board.completed);
          return (
            <Pressable
              key={habit.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              onPress={() => void toggleDailyHabit(habit)}
              style={({ pressed }) => [styles.task, pressed && styles.pressed]}>
              <View style={styles.copy}>
                <Text style={[styles.taskLabel, checked && styles.taskDone]}>{habit.label}</Text>
                <Text style={styles.state}>{checked ? 'Concluída' : 'Pendente'}</Text>
              </View>
              <View style={[styles.mark, checked && styles.markOn]} />
            </Pressable>
          );
        })}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.dismissTo('/inicio' as Href)}
        style={({ pressed }) => [styles.home, pressed && styles.pressed]}>
        <Text style={styles.homeLabel}>Voltar à página inicial</Text>
      </Pressable>
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
  title: {
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 40,
    lineHeight: 44,
  },
  explanation: {
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 15,
    lineHeight: 22,
  },
  count: {
    marginTop: 10,
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 13,
  },
  list: {
    marginTop: 24,
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
  home: {
    marginTop: 28,
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  homeLabel: {
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 14,
  },
  pressed: {
    opacity: 0.72,
  },
});
