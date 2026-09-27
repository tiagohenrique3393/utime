import { router, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '@/components/bottom-nav';
import { colors, fonts } from '@/constants/theme';
import { getSessionUserId } from '@/lib/accounts';
import {
  completedDayCount,
  dayProgress,
  dayStatus,
  isDayUnlocked,
  overallProgress,
  setTestMode,
  useJourneyBoard,
} from '@/lib/tasks';

const weeks = [
  { title: 'Semana 1', days: [1, 2, 3, 4, 5, 6, 7] },
  { title: 'Semana 2', days: [8, 9, 10, 11, 12, 13, 14] },
  { title: 'Semana 3', days: [15, 16, 17, 18, 19, 20, 21] },
  { title: 'Semana 4', days: [22, 23, 24, 25, 26, 27, 28] },
  { title: 'Semana 5', days: [29, 30] },
] as const;

const statusStyle = {
  green: { border: '#3E6B48', fill: '#E7F0E6', ink: '#245232' },
  yellow: { border: '#8A6A1E', fill: '#F8F1DC', ink: '#6A5010' },
  red: { border: '#8C4545', fill: '#F8E8E8', ink: '#7A3030' },
  locked: { border: colors.cardBorder, fill: colors.card, ink: colors.muted },
} as const;

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

function formatOverallPercent(value: number) {
  const rounded = Math.round(value * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace('.', ',');
  return `${text}%`;
}

function LockMark() {
  return (
    <View style={lockStyles.root}>
      <View style={lockStyles.shackle} />
      <View style={lockStyles.body} />
    </View>
  );
}

export default function ThirtyDaysScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 700;
  const journey = useJourneyBoard();
  const percent = overallProgress(journey);
  const concluded = completedDayCount(journey);
  const signedIn = getSessionUserId() !== null;

  return (
    <View style={styles.screen}>
      <SafeAreaView
        edges={signedIn ? ['top', 'left', 'right'] : ['top', 'right', 'bottom', 'left']}
        style={[styles.safe, isWide && styles.safeWide]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={[styles.column, isWide && styles.columnWide]}>
            <Pressable accessibilityRole="button" onPress={goBack} style={styles.back}>
              <Text style={styles.backLabel}>Voltar</Text>
            </Pressable>

            <Text style={styles.eyebrow}>Meus 30 dias</Text>
            <Text accessibilityRole="header" style={[styles.title, isWide && styles.titleWide]}>
              Minha jornada de 30 dias
            </Text>

            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>Progresso geral</Text>
                <Text style={styles.progressValue}>{formatOverallPercent(percent)}</Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${percent}%` }]} />
              </View>
              <Text style={styles.count}>{concluded} de 30 dias concluídos</Text>
            </View>

            {__DEV__ ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setTestMode(!journey.testMode)}
                style={[styles.testButton, journey.testMode && styles.testButtonOn]}>
                <Text style={[styles.testLabel, journey.testMode && styles.testLabelOn]}>
                  {journey.testMode ? 'Modo de teste ativo' : 'Modo de teste'}
                </Text>
              </Pressable>
            ) : null}

            <View style={styles.weeks}>
              {weeks.map((week) => (
                <View key={week.title} style={styles.week}>
                  <Text style={styles.weekTitle}>{week.title}</Text>
                  <View style={styles.weekRow}>
                    {week.days.map((day) => {
                      const locked = !isDayUnlocked(day, journey.testMode);
                      const dayPercent = dayProgress(journey, day);
                      const status = dayStatus(dayPercent, locked);
                      const palette = statusStyle[status];
                      const body = (
                        <>
                          <Text style={[styles.dayNumber, locked && styles.dayNumberLocked]}>{day}</Text>
                          {locked ? (
                            <LockMark />
                          ) : (
                            <Text style={[styles.dayPercent, { color: palette.ink }]}>{dayPercent}%</Text>
                          )}
                        </>
                      );

                      if (locked) {
                        return (
                          <View key={day} style={styles.cellSlot}>
                            <View
                              accessibilityLabel={`Dia ${day} bloqueado`}
                              style={[styles.cell, { borderColor: palette.border, backgroundColor: palette.fill }]}>
                              {body}
                            </View>
                          </View>
                        );
                      }

                      return (
                        <View key={day} style={styles.cellSlot}>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Dia ${day}`}
                            onPress={() => router.push(`/jornada?dia=${day}` as Href)}
                            style={({ pressed }) => [
                              styles.cell,
                              { borderColor: palette.border, backgroundColor: palette.fill },
                              pressed && styles.pressed,
                            ]}>
                            {body}
                            <View style={[styles.dot, { backgroundColor: palette.ink }]} />
                          </Pressable>
                        </View>
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
      {signedIn ? <BottomNav /> : null}
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
    maxWidth: 640,
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
    fontSize: 36,
    lineHeight: 40,
    textAlign: 'center',
  },
  titleWide: {
    fontSize: 44,
    lineHeight: 48,
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
    backgroundColor: colors.track,
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
  testButton: {
    alignSelf: 'center',
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  testButtonOn: {
    borderColor: colors.line,
  },
  testLabel: {
    color: colors.muted,
    fontFamily: fonts.text,
    fontSize: 12,
    letterSpacing: 0.4,
  },
  testLabelOn: {
    color: colors.gold,
  },
  weeks: {
    marginTop: 28,
    gap: 22,
  },
  week: {
    gap: 10,
  },
  weekTitle: {
    color: colors.gold,
    fontFamily: fonts.text,
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  weekRow: {
    flexDirection: 'row',
    marginHorizontal: -3,
  },
  cellSlot: {
    width: `${100 / 7}%`,
    padding: 3,
  },
  cell: {
    minHeight: 64,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
    gap: 4,
  },
  dayNumber: {
    color: colors.ivory,
    fontFamily: fonts.text,
    fontSize: 15,
  },
  dayNumberLocked: {
    color: colors.muted,
  },
  dayPercent: {
    fontFamily: fonts.text,
    fontSize: 10,
    letterSpacing: 0.2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
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
    color: colors.onPrimary,
    fontFamily: fonts.text,
    fontSize: 16,
    letterSpacing: 0.2,
  },
  pressed: {
    opacity: 0.84,
  },
});

const lockStyles = StyleSheet.create({
  root: {
    width: 12,
    height: 14,
    alignItems: 'center',
  },
  shackle: {
    width: 8,
    height: 6,
    borderWidth: 1.25,
    borderBottomWidth: 0,
    borderColor: colors.muted,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  body: {
    width: 10,
    height: 7,
    marginTop: -1,
    borderRadius: 1.5,
    backgroundColor: colors.muted,
  },
});
