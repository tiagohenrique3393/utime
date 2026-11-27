import { createElement, type ReactNode } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { fonts, ui } from '@/constants/theme';

const colors = {
  habits: '#39FF73',
  sleep: '#6EB6F2',
  mood: '#E6C14A',
};

function node(type: string, props: Record<string, unknown> | null, ...children: ReactNode[]) {
  return createElement(type, props, ...children);
}

function linePoints(values: readonly (number | null)[], width: number, height: number, padX: number, padY: number) {
  const count = values.length;
  if (count === 0) {
    return [];
  }
  return values.map((value, index) => {
    const x = count === 1 ? width / 2 : padX + (index * (width - padX * 2)) / (count - 1);
    if (value == null || !Number.isFinite(value)) {
      return null;
    }
    const y = height - padY - (Math.max(0, Math.min(100, value)) / 100) * (height - padY * 2);
    return { x, y };
  });
}

function polyline(points: ({ x: number; y: number } | null)[]) {
  const segments: string[] = [];
  let current: string[] = [];
  for (const point of points) {
    if (!point) {
      if (current.length) {
        segments.push(current.join(' '));
        current = [];
      }
      continue;
    }
    current.push(`${point.x},${point.y}`);
  }
  if (current.length) {
    segments.push(current.join(' '));
  }
  return segments;
}

/** Gráfico integrado: hábitos verde, sono azul, humor ouro. Ausências não viram 0. */
export function WellbeingChart({
  labels,
  habits,
  sleep,
  mood,
}: {
  labels: readonly string[];
  habits: readonly (number | null)[];
  sleep: readonly (number | null)[];
  mood: readonly (number | null)[];
}) {
  const width = 320;
  const height = 140;
  const padX = 10;
  const padY = 14;
  const hasAny = [...habits, ...sleep, ...mood].some((value) => value != null);

  if (!hasAny) {
    return <Text style={styles.empty}>Sem dados suficientes para o gráfico neste período.</Text>;
  }

  if (Platform.OS !== 'web') {
    return <Text style={styles.empty}>Gráfico disponível na versão web.</Text>;
  }

  const habitPts = linePoints(habits, width, height, padX, padY);
  const sleepPts = linePoints(sleep, width, height, padX, padY);
  const moodPts = linePoints(mood, width, height, padX, padY);

  return (
    <View>
      <View style={styles.legend}>
        <Text style={[styles.legendItem, { color: colors.habits }]}>Hábitos</Text>
        <Text style={[styles.legendItem, { color: colors.sleep }]}>Sono</Text>
        <Text style={[styles.legendItem, { color: colors.mood }]}>Humor</Text>
      </View>
      <View style={styles.figure}>
        {node(
          'svg',
          { viewBox: `0 0 ${width} ${height}`, width: '100%', height: '100%', accessibilityElementsHidden: true },
          [0, 50, 100].map((mark) => {
            const y = height - padY - (mark / 100) * (height - padY * 2);
            return node('line', {
              key: mark,
              x1: padX,
              y1: y,
              x2: width - padX,
              y2: y,
              stroke: 'rgba(243, 239, 232, 0.08)',
              strokeWidth: 1,
            });
          }),
          ...polyline(habitPts).map((points, index) =>
            node('polyline', {
              key: `h-${index}`,
              points,
              fill: 'none',
              stroke: colors.habits,
              strokeWidth: 1.8,
              strokeLinejoin: 'round',
              strokeLinecap: 'round',
            }),
          ),
          ...polyline(sleepPts).map((points, index) =>
            node('polyline', {
              key: `s-${index}`,
              points,
              fill: 'none',
              stroke: colors.sleep,
              strokeWidth: 1.8,
              strokeLinejoin: 'round',
              strokeLinecap: 'round',
            }),
          ),
          ...polyline(moodPts).map((points, index) =>
            node('polyline', {
              key: `m-${index}`,
              points,
              fill: 'none',
              stroke: colors.mood,
              strokeWidth: 1.8,
              strokeLinejoin: 'round',
              strokeLinecap: 'round',
            }),
          ),
        )}
      </View>
      <View style={styles.axis}>
        {labels.map((label, index) => {
          const show = labels.length <= 8 || index === 0 || index === labels.length - 1 || index % Math.ceil(labels.length / 6) === 0;
          return (
            <Text key={`${label}-${index}`} style={[styles.tick, !show && styles.tickHidden]}>
              {show ? label : ' '}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', gap: 14, marginBottom: 8 },
  legendItem: { fontFamily: fonts.display, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase' },
  figure: { width: '100%', aspectRatio: 320 / 140 },
  axis: { marginTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
  tick: { color: ui.faint, fontFamily: fonts.text, fontSize: 10, flex: 1, textAlign: 'center' },
  tickHidden: { opacity: 0 },
  empty: { color: ui.muted, fontFamily: fonts.text, fontSize: 13, lineHeight: 18 },
});
