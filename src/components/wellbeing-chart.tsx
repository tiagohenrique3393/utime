import { createElement, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts, ui } from '@/constants/theme';

const colors = {
  habits: '#39FF73',
  sleep: '#6EB6F2',
  mood: '#E6C14A',
};

const yMarks = [100, 75, 50, 25, 0] as const;

function node(type: string, props: Record<string, unknown> | null, ...children: ReactNode[]) {
  return createElement(type, props, ...children);
}

function linePoints(values: readonly (number | null)[], width: number, height: number, padX: number, padY: number) {
  const count = values.length;
  if (count === 0) {
    return [] as ({ x: number; y: number; value: number } | null)[];
  }
  return values.map((value, index) => {
    const x = count === 1 ? padX + (width - padX * 2) / 2 : padX + (index * (width - padX * 2)) / (count - 1);
    if (value == null || !Number.isFinite(value)) {
      return null;
    }
    const y = height - padY - (Math.max(0, Math.min(100, value)) / 100) * (height - padY * 2);
    return { x, y, value };
  });
}

/** Pontos posicionados por fração 0–1 no eixo X (ex.: horas do dia). */
function fractionPoints(
  entries: readonly { fraction: number; value: number | null }[],
  width: number,
  height: number,
  padX: number,
  padY: number,
) {
  return entries.map((entry) => {
    if (entry.value == null || !Number.isFinite(entry.value)) {
      return null;
    }
    const fraction = Math.max(0, Math.min(1, entry.fraction));
    const x = padX + fraction * (width - padX * 2);
    const y = height - padY - (Math.max(0, Math.min(100, entry.value)) / 100) * (height - padY * 2);
    return { x, y, value: entry.value };
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

function areaPath(points: ({ x: number; y: number } | null)[], height: number, padY: number) {
  const solid = points.filter((point): point is { x: number; y: number } => point != null);
  if (solid.length < 2) {
    return null;
  }
  const base = height - padY;
  return `M ${solid[0].x} ${base} L ${solid.map((point) => `${point.x} ${point.y}`).join(' L ')} L ${solid[solid.length - 1].x} ${base} Z`;
}

type SeriesMode = 'habits' | 'sleep' | 'mood' | 'all';

/** Gráfico integrado: hábitos verde, sono azul, humor ouro. Escala fixa 0–100%. Ausências não viram 0. */
export function WellbeingChart({
  labels,
  habits,
  sleep,
  mood,
  highlight = 'all',
  timed,
}: {
  labels: readonly string[];
  habits: readonly (number | null)[];
  sleep: readonly (number | null)[];
  mood: readonly (number | null)[];
  highlight?: SeriesMode;
  /** Quando presente, posiciona pontos pelo horário (0–1) em vez do índice do label. */
  timed?: {
    habits?: readonly { fraction: number; value: number | null }[];
    sleep?: readonly { fraction: number; value: number | null }[];
    mood?: readonly { fraction: number; value: number | null }[];
  };
}) {
  const width = 340;
  const height = 168;
  const padX = 36;
  const padY = 14;
  const hasAny =
    [...habits, ...sleep, ...mood].some((value) => value != null) ||
    Boolean(timed?.habits?.some((entry) => entry.value != null)) ||
    Boolean(timed?.sleep?.some((entry) => entry.value != null)) ||
    Boolean(timed?.mood?.some((entry) => entry.value != null));

  const [tip, setTip] = useState<string | null>(null);

  if (!hasAny) {
    return <Text style={styles.empty}>Sem dados suficientes para o gráfico neste período.</Text>;
  }

  if (Platform.OS !== 'web') {
    return <Text style={styles.empty}>Gráfico disponível na versão web.</Text>;
  }

  const habitPts = timed?.habits
    ? fractionPoints(timed.habits, width, height, padX, padY)
    : linePoints(habits, width, height, padX, padY);
  const sleepPts = timed?.sleep
    ? fractionPoints(timed.sleep, width, height, padX, padY)
    : linePoints(sleep, width, height, padX, padY);
  const moodPts = timed?.mood
    ? fractionPoints(timed.mood, width, height, padX, padY)
    : linePoints(mood, width, height, padX, padY);

  const showHabits = highlight === 'all' || highlight === 'habits';
  const showSleep = highlight === 'all' || highlight === 'sleep';
  const showMood = highlight === 'all' || highlight === 'mood';
  const habitArea = showHabits ? areaPath(habitPts, height, padY) : null;

  const dots: { key: string; x: number; y: number; color: string; label: string }[] = [];
  if (showHabits) {
    habitPts.forEach((point, index) => {
      if (point) {
        dots.push({ key: `h-${index}`, x: point.x, y: point.y, color: colors.habits, label: `Hábitos ${Math.round(point.value)}%` });
      }
    });
  }
  if (showSleep) {
    sleepPts.forEach((point, index) => {
      if (point) {
        dots.push({ key: `s-${index}`, x: point.x, y: point.y, color: colors.sleep, label: `Sono ${Math.round(point.value)}%` });
      }
    });
  }
  if (showMood) {
    moodPts.forEach((point, index) => {
      if (point) {
        dots.push({ key: `m-${index}`, x: point.x, y: point.y, color: colors.mood, label: `Humor ${Math.round(point.value)}%` });
      }
    });
  }

  return (
    <View>
      <View style={styles.legend}>
        {showHabits ? <Text style={[styles.legendItem, { color: colors.habits }]}>Hábitos</Text> : null}
        {showSleep ? <Text style={[styles.legendItem, { color: colors.sleep }]}>Sono</Text> : null}
        {showMood ? <Text style={[styles.legendItem, { color: colors.mood }]}>Humor</Text> : null}
      </View>
      <View style={styles.figure}>
        {node(
          'svg',
          { viewBox: `0 0 ${width} ${height}`, width: '100%', height: '100%', accessibilityElementsHidden: true },
          createElement(
            'defs',
            null,
            createElement(
              'linearGradient',
              { id: 'habit-fill', x1: '0', y1: '0', x2: '0', y2: '1' },
              createElement('stop', { offset: '0%', stopColor: colors.habits, stopOpacity: '0.28' }),
              createElement('stop', { offset: '100%', stopColor: colors.habits, stopOpacity: '0.02' }),
            ),
          ),
          ...yMarks.flatMap((mark) => {
            const y = height - padY - (mark / 100) * (height - padY * 2);
            return [
              node('line', {
                key: `grid-${mark}`,
                x1: padX,
                y1: y,
                x2: width - 8,
                y2: y,
                stroke: 'rgba(243, 239, 232, 0.1)',
                strokeWidth: 1,
              }),
              node(
                'text',
                {
                  key: `ylab-${mark}`,
                  x: padX - 6,
                  y: y + 3,
                  fill: 'rgba(201,196,188,0.72)',
                  fontSize: 9,
                  fontFamily: 'Manrope, sans-serif',
                  textAnchor: 'end',
                },
                `${mark}%`,
              ),
            ];
          }),
          habitArea
            ? node('path', {
                key: 'habit-area',
                d: habitArea,
                fill: 'url(#habit-fill)',
              })
            : null,
          ...polyline(habitPts).map((points, index) =>
            showHabits
              ? node('polyline', {
                  key: `h-${index}`,
                  points,
                  fill: 'none',
                  stroke: colors.habits,
                  strokeWidth: highlight === 'habits' ? 2.4 : 1.9,
                  strokeLinejoin: 'round',
                  strokeLinecap: 'round',
                  style: { filter: 'drop-shadow(0 0 3px rgba(57,255,115,0.55))' },
                })
              : null,
          ),
          ...polyline(sleepPts).map((points, index) =>
            showSleep
              ? node('polyline', {
                  key: `s-${index}`,
                  points,
                  fill: 'none',
                  stroke: colors.sleep,
                  strokeWidth: highlight === 'sleep' ? 2.4 : 1.9,
                  strokeLinejoin: 'round',
                  strokeLinecap: 'round',
                  style: { filter: 'drop-shadow(0 0 3px rgba(110,182,242,0.55))' },
                })
              : null,
          ),
          ...polyline(moodPts).map((points, index) =>
            showMood
              ? node('polyline', {
                  key: `m-${index}`,
                  points,
                  fill: 'none',
                  stroke: colors.mood,
                  strokeWidth: highlight === 'mood' ? 2.4 : 1.9,
                  strokeLinejoin: 'round',
                  strokeLinecap: 'round',
                  style: { filter: 'drop-shadow(0 0 3px rgba(230,193,74,0.55))' },
                })
              : null,
          ),
          ...dots.map((dot) =>
            node('circle', {
              key: dot.key,
              cx: dot.x,
              cy: dot.y,
              r: 3.2,
              fill: '#0A0A0A',
              stroke: dot.color,
              strokeWidth: 1.8,
            }),
          ),
        )}
        {Platform.OS === 'web'
          ? dots.map((dot) => (
              <Pressable
                key={`hit-${dot.key}`}
                accessibilityRole="button"
                accessibilityLabel={dot.label}
                onPress={() => setTip(dot.label)}
                style={[
                  styles.hit,
                  {
                    left: `${(dot.x / width) * 100}%`,
                    top: `${(dot.y / height) * 100}%`,
                  },
                ]}
              />
            ))
          : null}
      </View>
      {tip ? <Text style={styles.tip}>{tip}</Text> : null}
      <View style={styles.axis}>
        {labels.map((label, index) => {
          const show =
            labels.length <= 8 ||
            index === 0 ||
            index === labels.length - 1 ||
            index % Math.max(1, Math.ceil(labels.length / 6)) === 0;
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
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 8 },
  legendItem: { fontFamily: fonts.display, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase' },
  figure: { width: '100%', aspectRatio: 340 / 168, position: 'relative' },
  hit: {
    position: 'absolute',
    width: 18,
    height: 18,
    marginLeft: -9,
    marginTop: -9,
    borderRadius: 9,
  },
  tip: {
    marginTop: 4,
    color: ui.textChampagne,
    fontFamily: fonts.text,
    fontSize: 12,
    lineHeight: 16,
  },
  axis: { marginTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
  tick: { color: ui.faint, fontFamily: fonts.text, fontSize: 10, flex: 1, textAlign: 'center' },
  tickHidden: { opacity: 0 },
  empty: { color: ui.muted, fontFamily: fonts.text, fontSize: 13, lineHeight: 18 },
});
