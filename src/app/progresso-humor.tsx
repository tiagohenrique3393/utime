import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { PercentRing } from '@/components/progress-charts';
import { ProgressPlanet } from '@/components/progress-planet';
import { WellbeingChart } from '@/components/wellbeing-chart';
import { fonts, ui } from '@/constants/theme';
import { useAccountPlan } from '@/lib/account-plan';
import { moodDetailInsight } from '@/lib/checkin-insights';
import { getSessionUserId } from '@/lib/accounts';
import { todayKey } from '@/lib/habit-day';
import { compareVsLabel, relativePercentDelta } from '@/lib/progress-compare';
import { visibleProgressPeriod } from '@/lib/progress-access';
import type { ProgressPeriod } from '@/lib/progress-view';
import {
  currentPeriodDates,
  moodAverage,
  previousPeriodDates,
  wellbeingSeries,
  type MoodPoint,
} from '@/lib/progress-wellbeing';
import { useRequireSession } from '@/lib/require-session';
import { loadMoodUntil } from '@/lib/mood-store';

function asPeriod(value: string | string[] | undefined): ProgressPeriod {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'semana' || raw === 'mes' || raw === 'ano') {
    return raw;
  }
  return 'dia';
}

export default function ProgressoHumorScreen() {
  const signedIn = useRequireSession();
  const access = useAccountPlan();
  const params = useLocalSearchParams<{ period?: string }>();
  const requested = asPeriod(params.period);
  const period = visibleProgressPeriod(access.plan, requested);
  const [mood, setMood] = useState<MoodPoint[]>([]);
  const [series, setSeries] = useState<ReturnType<typeof wellbeingSeries> | null>(null);
  const [notice, setNotice] = useState('');

  useFocusEffect(
    useCallback(() => {
      const userId = getSessionUserId();
      if (!userId) {
        return;
      }
      let active = true;
      const today = todayKey();
      void (async () => {
        const moodLoad = await loadMoodUntil(userId, today);
        if (!active) {
          return;
        }
        if (!moodLoad.ok) {
          setNotice(moodLoad.message);
        }
        const rows = moodLoad.ok
          ? moodLoad.rows.map((row) => ({ localDate: row.localDate, period: row.period, score: row.score }))
          : [];
        const wellbeing = wellbeingSeries({
          today,
          period,
          sleep: [],
          mood: rows,
          habits: [],
        });
        setMood(rows);
        setSeries(wellbeing);
      })();
      return () => {
        active = false;
      };
    }, [period]),
  );

  if (!signedIn) {
    return <View style={styles.blank} />;
  }

  const prev = previousPeriodDates(todayKey(), period);
  const compare = relativePercentDelta(series?.moodScore ?? null, moodAverage(prev, mood));
  const insight = moodDetailInsight(series?.moodScore ?? null);

  return (
    <AppScreen tight backgroundColor="#050505" backdrop={<ProgressPlanet />}>
      <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backLabel}>‹ Voltar</Text>
      </Pressable>
      <Text accessibilityRole="header" style={styles.title}>
        Humor
      </Text>
      <Text style={styles.period}>{period.toUpperCase()}</Text>

      <View style={styles.hero}>
        <PercentRing percent={series?.moodScore ?? null} size={132} caption="Score de humor" />
        <View style={styles.meta}>
          <Text style={styles.metaLabel}>Média dos períodos respondidos</Text>
          <Text style={styles.metaCompare}>{compareVsLabel(period, compare)}</Text>
        </View>
      </View>

      {notice ? <Text style={styles.note}>{notice}</Text> : null}

      <View style={styles.chart}>
        <WellbeingChart labels={series?.labels ?? []} habits={[]} sleep={[]} mood={series?.mood ?? []} />
      </View>

      <View style={styles.insight}>
        <Text style={styles.insightText}>{insight}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(`/progresso?period=${period}` as Href)}
        style={styles.link}>
        <Text style={styles.linkLabel}>Voltar ao progresso</Text>
      </Pressable>
      {currentPeriodDates(todayKey(), period).length ? null : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: '#050505' },
  back: { alignSelf: 'flex-start', paddingVertical: 4 },
  backLabel: { color: ui.champagne, fontFamily: fonts.display, fontSize: 14, letterSpacing: 0.6, textTransform: 'uppercase' },
  title: {
    marginTop: 8,
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 26,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  period: {
    marginTop: 4,
    color: '#E6C14A',
    fontFamily: fonts.display,
    fontSize: 11,
    letterSpacing: 1.4,
  },
  hero: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  meta: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(230,193,74,0.35)',
    backgroundColor: 'rgba(10,10,10,0.85)',
    padding: 12,
    gap: 8,
  },
  metaLabel: { color: ui.muted, fontFamily: fonts.display, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase' },
  metaCompare: { color: ui.text, fontFamily: fonts.textMedium, fontSize: 15 },
  chart: {
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(230,193,74,0.2)',
    backgroundColor: 'rgba(8,8,8,0.72)',
    padding: 12,
  },
  insight: {
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(230,193,74,0.4)',
    padding: 12,
  },
  insightText: { color: ui.text, fontFamily: fonts.text, fontSize: 12, lineHeight: 17, textTransform: 'uppercase' },
  note: { marginTop: 10, color: ui.muted, fontFamily: fonts.text, fontSize: 13 },
  link: { marginTop: 16, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  linkLabel: { color: ui.champagne, fontFamily: fonts.display, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase' },
});
