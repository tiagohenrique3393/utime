import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '@/components/bottom-nav';
import { colors, fonts } from '@/constants/theme';
import { getSessionUserId } from '@/lib/accounts';
import {
  completedDayCount,
  overallProgress,
  pillarStats,
  pillars,
  progressPercent,
  useCompletedTaskIds,
  useJourneyBoard,
} from '@/lib/tasks';

function formatOverallPercent(value: number) {
  const rounded = Math.round(value * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace('.', ',');
  return `${text}%`;
}

export default function ProgressScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 700;
  const signedIn = getSessionUserId() !== null;
  const completed = useCompletedTaskIds();
  const today = progressPercent(completed.length);
  const journey = useJourneyBoard();
  const general = overallProgress(journey);
  const concluded = completedDayCount(journey);

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
            <Text style={styles.lead}>O dia de hoje, os três pilares e a jornada de 30 dias.</Text>

            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>Progresso de hoje</Text>
                <Text style={styles.progressValue}>{today}%</Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${today}%` }]} />
              </View>
            </View>

            <View style={[styles.pillars, isWide && styles.pillarsWide]}>
              {pillars.map((pillar) => {
                const stats = pillarStats(completed, pillar.id);
                return (
                  <Pressable
                    key={pillar.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${pillar.label}, ${stats.percent}%, ${stats.done} de ${stats.total}`}
                    onPress={() => router.push(`/pilar/${pillar.id}` as Href)}
                    style={({ pressed }) => [
                      styles.pillar,
                      isWide && styles.pillarWide,
                      pressed && styles.pressed,
                    ]}>
                    <View style={styles.pillarHeader}>
                      <View style={styles.stem} />
                      <Text style={styles.pillarLabel}>{pillar.label}</Text>
                      <Text style={styles.pillarPercent}>{stats.percent}%</Text>
                    </View>
                    <View style={[styles.track, styles.pillarTrack]}>
                      <View style={[styles.fill, { width: `${stats.percent}%` }]} />
                    </View>
                    <Text style={styles.pillarCount}>
                      {stats.done} de {stats.total}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>Progresso geral</Text>
                <Text style={styles.progressValue}>{formatOverallPercent(general)}</Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${general}%` }]} />
              </View>
              <Text style={styles.count}>{concluded} de 30 dias concluídos</Text>
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
  progressCard: {
    marginTop: 28,
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
    color: colors.muted,
    fontFamily: fonts.text,
    fontSize: 14,
  },
  pillars: {
    marginTop: 12,
    gap: 12,
  },
  pillarsWide: {
    flexDirection: 'row',
  },
  pillar: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  pillarWide: {
    flex: 1,
  },
  pillarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stem: {
    width: 1,
    height: 18,
    backgroundColor: colors.gold,
  },
  pillarLabel: {
    flex: 1,
    color: colors.ivory,
    fontFamily: fonts.text,
    fontSize: 16,
    letterSpacing: 0.4,
  },
  pillarPercent: {
    color: colors.ivory,
    fontFamily: fonts.text,
    fontSize: 14,
  },
  pillarTrack: {
    marginTop: 14,
  },
  pillarCount: {
    marginTop: 10,
    color: colors.muted,
    fontFamily: fonts.text,
    fontSize: 13,
  },
  pressed: {
    opacity: 0.84,
  },
});
