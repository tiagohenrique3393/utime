import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen, Eyebrow, TextButton, Track } from '@/components/app-screen';
import { fonts, ui } from '@/constants/theme';
import { pillarStats, pillars, toggleDayTask, useCompletedTaskIds, type PillarId } from '@/lib/tasks';

function isPillarId(value: string): value is PillarId {
  return pillars.some((pillar) => pillar.id === value);
}

export default function PillarScreen() {
  const params = useLocalSearchParams<{ pilar?: string }>();
  const raw = Array.isArray(params.pilar) ? params.pilar[0] : params.pilar;
  const pillar = raw && isPillarId(raw) ? pillars.find((item) => item.id === raw) : undefined;
  const completed = useCompletedTaskIds();
  const completedSet = new Set(completed);
  const stats = pillar ? pillarStats(completed, pillar.id) : { done: 0, total: 0, percent: 0 };

  useEffect(() => {
    if (!pillar) {
      router.replace('/inicio');
    }
  }, [pillar]);

  if (!pillar) {
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
      <Track percent={stats.percent} />
      <Text style={styles.count}>
        {stats.done} de {stats.total} · {stats.percent}%
      </Text>

      <View style={styles.list}>
        {pillar.tasks.map((task) => {
          const checked = completedSet.has(task.id);
          return (
            <Pressable
              key={task.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              onPress={() => toggleDayTask(1, task.id)}
              style={({ pressed }) => [styles.task, pressed && styles.pressed]}>
              <View style={styles.copy}>
                <Text style={[styles.taskLabel, checked && styles.taskDone]}>{task.label}</Text>
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
