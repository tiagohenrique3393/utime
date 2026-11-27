import { createElement, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts, ui } from '@/constants/theme';

const colors = {
  habits: '#39FF73',
  sleep: '#6EB6F2',
  mood: '#E6C14A',
};

const yMarks = [100, 80, 60, 40, 20, 0] as const;

type ChartPoint = { x: number; y: number; value: number; index: number };

function node(type: string, props: Record<string, unknown> | null, ...children: ReactNode[]) {
  return createElement(type, props, ...children);
}

function linePoints(values: readonly (number | null)[], width: number, height: number, padX: number, padY: number) {
  const count = values.length;
  if (count === 0) {
    return [] as (ChartPoint | null)[];
  }
  return values.map((value, index) => {
    const x = count === 1 ? padX + (width - padX * 2) / 2 : padX + (index * (width - padX * 2)) / (count - 1);
    if (value == null || !Number.isFinite(value)) {
      return null;
    }
    const y = height - padY - (Math.max(0, Math.min(100, value)) / 100) * (height - padY * 2);
    return { x, y, value, index };
  });
}

function fractionPoints(
  entries: readonly { fraction: number; value: number | null }[],
  width: number,
  height: number,
  padX: number,
  padY: number,
) {
  return entries.map((entry, index) => {
    if (entry.value == null || !Number.isFinite(entry.value)) {
      return null;
    }
    const fraction = Math.max(0, Math.min(1, entry.fraction));
    const x = padX + fraction * (width - padX * 2);
    const y = height - padY - (Math.max(0, Math.min(100, entry.value)) / 100) * (height - padY * 2);
    return { x, y, value: entry.value, index };
  });
}

function solidRuns(points: ({ x: number; y: number } | null)[]) {
  const runs: { x: number; y: number }[][] = [];
  let current: { x: number; y: number }[] = [];
  for (const point of points) {
    if (!point) {
      if (current.length) {
        runs.push(current);
        current = [];
      }
      continue;
    }
    current.push(point);
  }
  if (current.length) {
    runs.push(current);
  }
  return runs;
}

function linearPaths(points: ({ x: number; y: number } | null)[]) {
  return solidRuns(points).map((run) => {
    if (run.length === 1) {
      return `M ${run[0].x} ${run[0].y}`;
    }
    return `M ${run[0].x} ${run[0].y} ${run.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ')}`;
  });
}

/** Degrau: mantém o valor até o próximo instante, depois sobe/desce. */
function stepPaths(points: ({ x: number; y: number } | null)[]) {
  return solidRuns(points).map((run) => {
    if (run.length === 1) {
      return `M ${run[0].x} ${run[0].y}`;
    }
    const parts = [`M ${run[0].x} ${run[0].y}`];
    for (let i = 1; i < run.length; i += 1) {
      parts.push(`L ${run[i].x} ${run[i - 1].y}`);
      parts.push(`L ${run[i].x} ${run[i].y}`);
    }
    return parts.join(' ');
  });
}

function stepAreaPath(points: ({ x: number; y: number } | null)[], height: number, padY: number) {
  const run = solidRuns(points)[0];
  if (!run || run.length === 0) {
    return null;
  }
  const base = height - padY;
  const parts = [`M ${run[0].x} ${base}`, `L ${run[0].x} ${run[0].y}`];
  for (let i = 1; i < run.length; i += 1) {
    parts.push(`L ${run[i].x} ${run[i - 1].y}`);
    parts.push(`L ${run[i].x} ${run[i].y}`);
  }
  parts.push(`L ${run[run.length - 1].x} ${base} Z`);
  return parts.join(' ');
}

/** Curva suave (Catmull-Rom → cúbica). Lacunas não viram zero. */
function curvePaths(points: ({ x: number; y: number } | null)[]) {
  return solidRuns(points).map((run) => {
    if (run.length === 1) {
      return `M ${run[0].x} ${run[0].y}`;
    }
    if (run.length === 2) {
      return `M ${run[0].x} ${run[0].y} L ${run[1].x} ${run[1].y}`;
    }
    let d = `M ${run[0].x} ${run[0].y}`;
    for (let i = 0; i < run.length - 1; i += 1) {
      const p0 = run[Math.max(0, i - 1)];
      const p1 = run[i];
      const p2 = run[i + 1];
      const p3 = run[Math.min(run.length - 1, i + 2)];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  });
}

function areaPath(points: ({ x: number; y: number } | null)[], height: number, padY: number) {
  const solid = points.filter((point): point is { x: number; y: number } => point != null);
  if (solid.length < 2) {
    return null;
  }
  const base = height - padY;
  return `M ${solid[0].x} ${base} L ${solid.map((point) => `${point.x} ${point.y}`).join(' L ')} L ${solid[solid.length - 1].x} ${base} Z`;
}

function formatPct(value: number) {
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)}%`;
}

function fractionLabel(fraction: number) {
  const total = Math.round(Math.max(0, Math.min(1, fraction)) * 24 * 60);
  const hour = Math.floor(total / 60);
  const minute = total % 60;
  if (hour >= 23 && minute >= 59) {
    return '23:59';
  }
  if (minute === 0) {
    return `${String(hour).padStart(2, '0')}h`;
  }
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
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
  lineStyle = 'curve',
}: {
  labels: readonly string[];
  habits: readonly (number | null)[];
  sleep: readonly (number | null)[];
  mood: readonly (number | null)[];
  highlight?: SeriesMode;
  timed?: {
    habits?: readonly { fraction: number; value: number | null }[];
    sleep?: readonly { fraction: number; value: number | null }[];
    mood?: readonly { fraction: number; value: number | null }[];
  };
  lineStyle?: 'step' | 'curve' | 'linear';
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

  const [tip, setTip] = useState<{ title: string; lines: string[] } | null>(null);

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

  const pathFor = (pts: (ChartPoint | null)[], style: 'step' | 'curve' | 'linear') => {
    if (style === 'step') {
      return stepPaths(pts);
    }
    if (style === 'curve') {
      return curvePaths(pts);
    }
    return linearPaths(pts);
  };

  const habitPaths = pathFor(habitPts, lineStyle);
  const sleepPaths = pathFor(sleepPts, lineStyle === 'step' ? 'linear' : lineStyle);
  const moodPaths = pathFor(moodPts, lineStyle === 'step' ? 'linear' : lineStyle);
  const habitArea =
    showHabits && lineStyle === 'step' ? stepAreaPath(habitPts, height, padY) : showHabits ? areaPath(habitPts, height, padY) : null;

  /** Referência visual 0% → primeiro ponto (não é registro real). */
  function ghostLead(pts: (ChartPoint | null)[]) {
    const solid = pts.filter((point): point is ChartPoint => point != null);
    if (solid.length !== 1) {
      return null;
    }
    const baseY = height - padY;
    return `M ${padX} ${baseY} L ${solid[0].x} ${solid[0].y}`;
  }
  const sleepGhost = showSleep ? ghostLead(sleepPts) : null;
  const moodGhost = showMood ? ghostLead(moodPts) : null;

  type Hit = { key: string; x: number; y: number; color: string; title: string; lines: string[] };
  const hits: Hit[] = [];

  if (!timed) {
    for (let index = 0; index < labels.length; index += 1) {
      const lines: string[] = [];
      const hx = habitPts[index];
      const sx = sleepPts[index];
      const mx = moodPts[index];
      if (showHabits && hx) {
        lines.push(`Hábitos ${formatPct(hx.value)}`);
      }
      if (showSleep && sx) {
        lines.push(`Sono ${formatPct(sx.value)}`);
      }
      if (showMood && mx) {
        lines.push(`Humor ${formatPct(mx.value)}`);
      }
      if (!lines.length) {
        continue;
      }
      const anchor = hx ?? sx ?? mx;
      if (!anchor) {
        continue;
      }
      hits.push({
        key: `col-${index}`,
        x: anchor.x,
        y: anchor.y,
        color: hx ? colors.habits : sx ? colors.sleep : colors.mood,
        title: labels[index] ?? '',
        lines,
      });
    }
  } else {
    if (showHabits) {
      habitPts.forEach((point, index) => {
        if (!point) {
          return;
        }
        hits.push({
          key: `h-${index}`,
          x: point.x,
          y: point.y,
          color: colors.habits,
          title: fractionLabel(timed.habits?.[index]?.fraction ?? 0),
          lines: [`Hábitos ${formatPct(point.value)}`],
        });
      });
    }
    if (showSleep) {
      sleepPts.forEach((point, index) => {
        if (!point) {
          return;
        }
        hits.push({
          key: `s-${index}`,
          x: point.x,
          y: point.y,
          color: colors.sleep,
          title: fractionLabel(timed.sleep?.[index]?.fraction ?? 0),
          lines: [`Sono ${formatPct(point.value)}`],
        });
      });
    }
    if (showMood) {
      moodPts.forEach((point, index) => {
        if (!point) {
          return;
        }
        hits.push({
          key: `m-${index}`,
          x: point.x,
          y: point.y,
          color: colors.mood,
          title: fractionLabel(timed.mood?.[index]?.fraction ?? 0),
          lines: [`Humor ${formatPct(point.value)}`],
        });
      });
    }
  }

  const renderDots = (pts: (ChartPoint | null)[], color: string, prefix: string) =>
    pts.map((point, index) =>
      point
        ? node('circle', {
            key: `${prefix}-${index}`,
            cx: point.x,
            cy: point.y,
            r: 3.2,
            fill: '#0A0A0A',
            stroke: color,
            strokeWidth: 1.8,
          })
        : null,
    );

  return (
    <View>
      <View style={styles.legend}>
        {showHabits ? (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.habits }]} />
            <Text style={[styles.legendText, { color: colors.habits }]}>Hábitos</Text>
          </View>
        ) : null}
        {showSleep ? (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.sleep }]} />
            <Text style={[styles.legendText, { color: colors.sleep }]}>Sono</Text>
          </View>
        ) : null}
        {showMood ? (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.mood }]} />
            <Text style={[styles.legendText, { color: colors.mood }]}>Humor</Text>
          </View>
        ) : null}
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
          ...habitPaths.map((d, index) =>
            showHabits
              ? node('path', {
                  key: `h-${index}`,
                  d,
                  fill: 'none',
                  stroke: colors.habits,
                  strokeWidth: highlight === 'habits' ? 2.4 : 1.9,
                  strokeLinejoin: 'round',
                  strokeLinecap: 'round',
                  style: { filter: 'drop-shadow(0 0 3px rgba(57,255,115,0.55))' },
                })
              : null,
          ),
          sleepGhost
            ? node('path', {
                key: 'sleep-ghost',
                d: sleepGhost,
                fill: 'none',
                stroke: colors.sleep,
                strokeWidth: 1.4,
                strokeDasharray: '4 4',
                opacity: 0.45,
              })
            : null,
          moodGhost
            ? node('path', {
                key: 'mood-ghost',
                d: moodGhost,
                fill: 'none',
                stroke: colors.mood,
                strokeWidth: 1.4,
                strokeDasharray: '4 4',
                opacity: 0.45,
              })
            : null,
          ...sleepPaths.map((d, index) =>
            showSleep
              ? node('path', {
                  key: `s-${index}`,
                  d,
                  fill: 'none',
                  stroke: colors.sleep,
                  strokeWidth: highlight === 'sleep' ? 2.4 : 1.9,
                  strokeLinejoin: 'round',
                  strokeLinecap: 'round',
                  style: { filter: 'drop-shadow(0 0 3px rgba(110,182,242,0.55))' },
                })
              : null,
          ),
          ...moodPaths.map((d, index) =>
            showMood
              ? node('path', {
                  key: `m-${index}`,
                  d,
                  fill: 'none',
                  stroke: colors.mood,
                  strokeWidth: highlight === 'mood' ? 2.4 : 1.9,
                  strokeLinejoin: 'round',
                  strokeLinecap: 'round',
                  style: { filter: 'drop-shadow(0 0 3px rgba(230,193,74,0.55))' },
                })
              : null,
          ),
          ...(showHabits ? renderDots(habitPts, colors.habits, 'hd') : []),
          ...(showSleep ? renderDots(sleepPts, colors.sleep, 'sd') : []),
          ...(showMood ? renderDots(moodPts, colors.mood, 'md') : []),
        )}
        {hits.map((hit) => (
          <Pressable
            key={`hit-${hit.key}`}
            accessibilityRole="button"
            accessibilityLabel={`${hit.title}. ${hit.lines.join('. ')}`}
            onPress={() => setTip({ title: hit.title, lines: hit.lines })}
            style={[
              styles.hit,
              {
                left: `${(hit.x / width) * 100}%`,
                top: `${(hit.y / height) * 100}%`,
              },
            ]}
          />
        ))}
      </View>
      {tip ? (
        <View style={styles.tipBox}>
          <Text style={styles.tipTitle}>{tip.title}</Text>
          {tip.lines.map((line) => (
            <Text key={line} style={styles.tipLine}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}
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
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontFamily: fonts.display, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase' },
  figure: { width: '100%', aspectRatio: 340 / 168, position: 'relative' },
  hit: {
    position: 'absolute',
    width: 18,
    height: 18,
    marginLeft: -9,
    marginTop: -9,
    borderRadius: 9,
  },
  tipBox: {
    marginTop: 6,
    alignSelf: 'flex-start',
    maxWidth: '100%',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(243,239,232,0.16)',
    backgroundColor: 'rgba(8,8,8,0.92)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  tipTitle: {
    color: ui.textChampagne,
    fontFamily: fonts.display,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  tipLine: {
    color: ui.text,
    fontFamily: fonts.text,
    fontSize: 12,
    lineHeight: 16,
  },
  axis: { marginTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
  tick: { color: ui.faint, fontFamily: fonts.text, fontSize: 10, flex: 1, textAlign: 'center' },
  tickHidden: { opacity: 0 },
  empty: { color: ui.muted, fontFamily: fonts.text, fontSize: 13, lineHeight: 18 },
});
