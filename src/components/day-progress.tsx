import { StyleSheet, Text, View } from 'react-native';

import { ExcellenceSpark } from '@/components/excellence-spark';
import { useReducedMotion, useSettledNumbers } from '@/components/motion';
import { fonts, ui } from '@/constants/theme';
import { getProgressColor, progressBandColor, progressBandGlow, showsExcellence, type ProgressBand } from '@/lib/progress-color';

const glow: Record<ProgressBand, string> = {
  red: progressBandGlow.red,
  green: progressBandGlow.green,
  gold: progressBandGlow.gold,
};

export function progressTone(percent: number) {
  if (percent < 1) {
    return null;
  }
  const band = getProgressColor(percent);
  return { line: progressBandColor[band], glow: glow[band] };
}

export function DayProgress({ percent, marked = false }: { percent: number; marked?: boolean }) {
  const reduced = useReducedMotion();
  const safe = Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 0;
  const [value = 0] = useSettledNumbers([safe], reduced);
  const band = getProgressColor(safe);
  const lit = value >= 0.5;
  const excellent = showsExcellence(safe);
  const fillGlow = excellent ? (reduced ? undefined : `0 0 10px ${glow.gold}`) : `0 0 8px ${glow[band]}`;

  return (
    <View>
      {marked ? (
        <View style={styles.labels}>
          <View style={styles.meta}>
            <Text style={styles.markTitle}>Meta do dia</Text>
            <Text style={styles.markValue}>70%</Text>
          </View>
          <View style={styles.excellence}>
            <Text style={styles.markTitle}>Excelência</Text>
            <Text style={styles.markValue}>100%</Text>
          </View>
        </View>
      ) : null}
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(safe) }}
        style={styles.rail}>
        <View style={styles.track} />
        {lit ? (
          <View
            style={[
              styles.fill,
              { width: `${value}%`, backgroundColor: progressBandColor[band], boxShadow: fillGlow },
            ]}
          />
        ) : null}
        {marked ? (
          <>
            <View style={[styles.dot, styles.dotStart]} />
            <View style={[styles.dot, styles.dotMeta]} />
            {excellent ? (
              <View style={styles.spark} pointerEvents="none">
                <ExcellenceSpark size={14} />
              </View>
            ) : (
              <View style={[styles.dot, styles.dotEnd]} />
            )}
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labels: {
    height: 34,
    marginBottom: 8,
  },
  meta: {
    position: 'absolute',
    left: '70%',
    bottom: 0,
    transform: [{ translateX: -28 }],
    alignItems: 'center',
  },
  excellence: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    alignItems: 'flex-end',
  },
  markTitle: {
    color: ui.textChampagne,
    fontFamily: fonts.displayLight,
    fontSize: 8,
    lineHeight: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  markValue: {
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 11,
    lineHeight: 14,
  },
  rail: {
    height: 8,
    justifyContent: 'center',
  },
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 3,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#2A2826',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 3,
    height: 2,
    borderRadius: 1,
  },
  dot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F3EFE8',
  },
  dotStart: {
    left: 0,
  },
  dotMeta: {
    left: '70%',
    marginLeft: -4,
  },
  dotEnd: {
    right: 0,
  },
  spark: {
    position: 'absolute',
    right: -6,
    top: -4,
  },
});
