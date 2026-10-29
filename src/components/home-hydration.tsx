import { createElement, useEffect, useSyncExternalStore } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { fonts, ui } from '@/constants/theme';
import {
  hydrationDaySnapshot,
  hydrationProgress,
  loadHydration,
  subscribeHydrationDay,
  type HydrationDay,
} from '@/lib/hydration';
import { formatHydrationAmount } from '@/lib/hydration-volume';

function Drop() {
  if (Platform.OS === 'web') {
    return createElement(
      'svg',
      { width: 18, height: 18, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
      createElement('path', {
        d: 'M8 1.6C8 1.6 3.2 6.8 3.2 10a4.8 4.8 0 0 0 9.6 0C12.8 6.8 8 1.6 8 1.6z',
        fill: '#6EB6F2',
      }),
    );
  }
  return <View style={styles.drop} />;
}

export function HomeHydration({ userId, dateKey }: { userId: string | null; dateKey: string }) {
  const day = useSyncExternalStore(
    subscribeHydrationDay,
    () => (userId && dateKey ? hydrationDaySnapshot(userId, dateKey) : null),
    () => (userId && dateKey ? hydrationDaySnapshot(userId, dateKey) : null),
  );

  useEffect(() => {
    if (!userId || !dateKey) {
      return;
    }
    void loadHydration(userId, dateKey);
  }, [dateKey, userId]);

  return <HydrationSummary day={day} />;
}

export function HydrationSummary({ day }: { day: HydrationDay | null }) {
  if (!day) {
    return (
      <View style={styles.card}>
        <View style={styles.icon}>
          <Drop />
        </View>
        <View style={styles.body}>
          <Text style={styles.title}>Hidratação</Text>
          <Text style={styles.amount}>—</Text>
        </View>
      </View>
    );
  }

  const consumed = day.consumedMl;
  const goal = day.goalMl;
  const progress = hydrationProgress(consumed, goal);
  const goalLabel = goal == null ? 'Defina sua meta' : formatHydrationAmount(goal);

  return (
    <View style={styles.card}>
      <View style={styles.icon}>
        <Drop />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>Hidratação</Text>
        <Text style={styles.amount}>
          {goal == null ? formatHydrationAmount(consumed) : `${formatHydrationAmount(consumed)} / ${goalLabel}`}
        </Text>
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: progress }}
          style={styles.rail}>
          {progress > 0 ? <View style={[styles.fill, { width: `${progress}%` }]} /> : null}
        </View>
      </View>
      <View style={styles.goal}>
        <Text style={styles.goalTitle}>Meta</Text>
        <Text style={styles.goalValue}>{goalLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    minHeight: 78,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(243, 239, 232, 0.1)',
    backgroundColor: 'rgba(8, 8, 8, 0.78)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(110, 182, 242, 0.12)',
  },
  drop: {
    width: 10,
    height: 14,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 2,
    backgroundColor: '#6EB6F2',
    transform: [{ rotate: '45deg' }],
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  title: {
    color: ui.textChampagne,
    fontFamily: fonts.display,
    fontSize: 11,
    lineHeight: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  amount: {
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 16,
    lineHeight: 20,
  },
  rail: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#1A1917',
    overflow: 'hidden',
  },
  fill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#6EB6F2',
  },
  goal: {
    alignItems: 'flex-end',
    gap: 2,
  },
  goalTitle: {
    color: ui.muted,
    fontFamily: fonts.display,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  goalValue: {
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 14,
    lineHeight: 18,
  },
});
