import { createElement, type ReactNode } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { progressTone } from '@/components/day-progress';
import { fonts, ui } from '@/constants/theme';
import { formatDailyPercent } from '@/lib/habit-day';
import { formatWater } from '@/lib/hydration';
import type { PercentPoint, WaterPoint } from '@/lib/progress-view';

function node(type: string, props: Record<string, unknown> | null, ...children: ReactNode[]) {
  return createElement(type, props, ...children);
}

export function PercentRing({ percent, size = 228 }: { percent: number | null; size?: number }) {
  const stroke = Math.max(8, Math.round(size * 0.045));
  const radius = (size - stroke) / 2;
  const turn = 2 * Math.PI * radius;
  const safe = percent == null ? 0 : Math.max(0, Math.min(100, percent));
  const tone = percent != null && percent >= 1 ? progressTone(percent) : null;
  const dash = (safe / 100) * turn;
  const label = percent == null ? 'Sem registro neste período' : formatDailyPercent(percent);

  if (Platform.OS !== 'web') {
    return (
      <View
        accessibilityLabel={label}
        style={[
          styles.ringWrap,
          styles.nativeRing,
          { width: size, height: size, borderRadius: size / 2, borderColor: tone?.line ?? 'rgba(243,239,232,0.16)' },
        ]}>
        <Text style={[styles.ringValue, { fontSize: Math.round(size * 0.22) }]}>{percent == null ? '—' : formatDailyPercent(percent)}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.ringWrap, { width: size, height: size }]} accessibilityLabel={label}>
      {node(
        'svg',
        { width: size, height: size, viewBox: `0 0 ${size} ${size}`, accessibilityElementsHidden: true },
        node('circle', {
          cx: size / 2,
          cy: size / 2,
          r: radius,
          fill: 'none',
          stroke: 'rgba(243, 239, 232, 0.1)',
          strokeWidth: stroke,
        }),
        node('circle', {
          cx: size / 2,
          cy: size / 2,
          r: radius,
          fill: 'none',
          stroke: tone?.line ?? 'rgba(243,239,232,0.2)',
          strokeWidth: stroke,
          strokeLinecap: 'round',
          strokeDasharray: `${dash} ${turn}`,
          transform: `rotate(-90 ${size / 2} ${size / 2})`,
          style: tone ? { filter: `drop-shadow(0 0 7px ${tone.glow})` } : undefined,
        }),
      )}
      <View style={styles.ringLabel} pointerEvents="none">
        <Text style={[styles.ringValue, { fontSize: Math.round(size * 0.22), lineHeight: Math.round(size * 0.26) }]}>
          {percent == null ? '—' : formatDailyPercent(percent)}
        </Text>
      </View>
    </View>
  );
}

export function PercentBars({ points }: { points: readonly PercentPoint[] }) {
  const dense = points.length > 14;
  if (points.length === 0 || points.every((point) => point.value == null)) {
    return <Text style={styles.empty}>Este período ainda não tem conclusões registradas.</Text>;
  }
  return (
    <View style={styles.bars}>
      {points.map((point, index) => {
        const showLabel = !dense || index === 0 || point.label === '1' || Number(point.label) % 5 === 0 || index === points.length - 1;
        const height = point.value == null ? 0 : Math.max(2, Math.round((Math.max(0, Math.min(100, point.value)) / 100) * 112));
        const tone = point.value != null && point.value >= 1 ? progressTone(point.value) : null;
        return (
          <View key={point.key} style={styles.column} accessibilityLabel={`${point.label}: ${point.value == null ? 'sem registro' : formatDailyPercent(point.value)}`}>
            <View style={styles.plot}>
              {point.value != null ? (
                <View style={[styles.bar, { height, backgroundColor: tone?.line ?? '#E15A4C' }]} />
              ) : null}
            </View>
            <Text style={[styles.tick, !showLabel && styles.tickHidden]}>{showLabel ? point.label : ' '}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function WaterBars({ points }: { points: readonly WaterPoint[] }) {
  const present = points.filter((point) => point.consumedMl != null);
  const dense = points.length > 14;
  if (present.length === 0) {
    return <Text style={styles.empty}>Este período ainda não tem água registrada.</Text>;
  }
  const max = Math.max(...present.map((point) => point.consumedMl ?? 0), 1);
  return (
    <View style={styles.bars}>
      {points.map((point, index) => {
        const showLabel = !dense || index === 0 || point.label === '1' || Number(point.label) % 5 === 0 || index === points.length - 1;
        const height = point.consumedMl == null ? 0 : Math.max(2, Math.round((point.consumedMl / max) * 112));
        const amount = point.consumedMl == null ? 'sem registro' : formatWater(point.consumedMl);
        return (
          <View key={point.key} style={styles.column} accessibilityLabel={`${point.label}: ${amount}`}>
            <View style={styles.plot}>
              {point.consumedMl != null ? <View style={[styles.bar, styles.waterBar, { height }]} /> : null}
            </View>
            <Text style={[styles.tick, !showLabel && styles.tickHidden]}>{showLabel ? point.label : ' '}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  ringWrap: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nativeRing: {
    borderWidth: 8,
  },
  ringLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: {
    color: ui.text,
    fontFamily: fonts.textLight,
    fontSize: 36,
    lineHeight: 42,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    minHeight: 148,
  },
  column: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 8,
  },
  plot: {
    height: 112,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '70%',
    maxWidth: 18,
    borderRadius: 2,
  },
  waterBar: {
    backgroundColor: ui.champagne,
  },
  tick: {
    color: ui.faint,
    fontFamily: fonts.text,
    fontSize: 10,
    lineHeight: 12,
    textAlign: 'center',
  },
  tickHidden: {
    opacity: 0,
  },
  empty: {
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 14,
    lineHeight: 20,
  },
});
