import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts } from '@/constants/theme';
import { pillarStats, pillars, toggleDayTask, useCompletedTaskIds, type PillarId } from '@/lib/tasks';

function isPillarId(value: string): value is PillarId {
  return pillars.some((pillar) => pillar.id === value);
}

function goBack() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace('/inicio');
}

function goHome() {
  router.dismissTo('/inicio');
}

export default function PillarScreen() {
  const params = useLocalSearchParams<{ pilar?: string }>();
  const raw = Array.isArray(params.pilar) ? params.pilar[0] : params.pilar;
  const pillar = raw && isPillarId(raw) ? pillars.find((item) => item.id === raw) : undefined;
  const { width } = useWindowDimensions();
  const isWide = width >= 700;
  const completed = useCompletedTaskIds();
  const completedSet = new Set(completed);
  const stats = pillar ? pillarStats(completed, pillar.id) : { done: 0, total: 0, percent: 0 };

  useEffect(() => {
    if (!pillar) {
      router.replace('/inicio');
    }
  }, [pillar]);

  if (!pillar) {
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
            <Pressable accessibilityRole="button" onPress={goBack} style={styles.back}>
              <Text style={styles.backLabel}>Voltar</Text>
            </Pressable>

            <Text style={styles.eyebrow}>Pilar</Text>
            <Text accessibilityRole="header" style={styles.title}>
              {pillar.label}
            </Text>
            <Text style={styles.explanation}>{pillar.text}</Text>

            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>Progresso do pilar</Text>
                <Text style={styles.progressValue}>{stats.percent}%</Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${stats.percent}%` }]} />
              </View>
              <Text style={styles.count}>
                {stats.done} de {stats.total} atividades concluídas
              </Text>
            </View>

            <View style={styles.list}>
              {pillar.tasks.map((task) => {
                const checked = completedSet.has(task.id);
                return (
                  <Pressable
                    key={task.id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                    onPress={() => toggleDayTask(1, task.id)}
                    style={({ pressed }) => [styles.task, checked && styles.taskChecked, pressed && styles.pressed]}>
                    <View style={[styles.box, checked && styles.boxChecked]}>
                      {checked ? <View style={styles.tick} /> : null}
                    </View>
                    <View style={styles.taskCopy}>
                      <Text style={styles.taskLabel}>{task.label}</Text>
                      <Text style={[styles.taskState, checked && styles.taskStateDone]}>
                        {checked ? 'Concluída' : 'Pendente'}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
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
    fontSize: 42,
    lineHeight: 46,
    textAlign: 'center',
  },
  explanation: {
    marginTop: 12,
    color: colors.muted,
    fontFamily: fonts.text,
    fontSize: 16,
    lineHeight: 24,
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
  count: {
    marginTop: 14,
    color: colors.ivory,
    fontFamily: fonts.text,
    fontSize: 14,
    textAlign: 'center',
  },
  list: {
    marginTop: 22,
    gap: 8,
  },
  task: {
    minHeight: 68,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  taskChecked: {
    borderColor: colors.gold,
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
  taskCopy: {
    flex: 1,
    gap: 2,
  },
  taskLabel: {
    color: colors.ivory,
    fontFamily: fonts.text,
    fontSize: 15,
    lineHeight: 21,
  },
  taskState: {
    color: colors.muted,
    fontFamily: fonts.text,
    fontSize: 13,
  },
  taskStateDone: {
    color: colors.gold,
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
