import { createElement, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts, ui } from '@/constants/theme';
import { progressBandColor } from '@/lib/progress-color';

const colors = {
  habits: '#39FF73',
  sleep: '#6EB6F2',
  mood: '#E6C14A',
};

const yMarks = [100, 80, 60, 40, 20, 0] as const;
/** Meta oficial de desempenho (mesma regra da Constância / anéis). */
const goalPercent = 70;

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

/**
 * Curva monotônica suave (sem ultrapassar os valores reais entre pontos).
 * Ideal para hábitos, sono e humor sem fabricar picos.
 */
function smoothPaths(points: ({ x: number; y: number } | null)[]) {
  return solidRuns(points).map((run) => {
    if (run.length === 1) {
      return `M ${run[0].x} ${run[0].y}`;
    }
    if (run.length === 2) {
      const midX = (run[0].x + run[1].x) / 2;
      return `M ${run[0].x} ${run[0].y} C ${midX} ${run[0].y}, ${midX} ${run[1].y}, ${run[1].x} ${run[1].y}`;
    }
    let d = `M ${run[0].x} ${run[0].y}`;
    for (let i = 0; i < run.length - 1; i += 1) {
      const p1 = run[i];
      const p2 = run[i + 1];
      const dx = (p2.x - p1.x) / 3;
      d += ` C ${p1.x + dx} ${p1.y}, ${p2.x - dx} ${p2.y}, ${p2.x} ${p2.y}`;
    }
    return d;
  });
}

function smoothAreaPath(points: ({ x: number; y: number } | null)[], height: number, padY: number) {
  const run = solidRuns(points)[0];
  if (!run || run.length === 0) {
    return null;
  }
  const base = height - padY;
  if (run.length === 1) {
    return `M ${run[0].x} ${base} L ${run[0].x} ${run[0].y} L ${run[0].x} ${base} Z`;
  }
  let d = `M ${run[0].x} ${base} L ${run[0].x} ${run[0].y}`;
  for (let i = 0; i < run.length - 1; i += 1) {
    const p1 = run[i];
    const p2 = run[i + 1];
    const dx = (p2.x - p1.x) / 3;
    d += ` C ${p1.x + dx} ${p1.y}, ${p2.x - dx} ${p2.y}, ${p2.x} ${p2.y}`;
  }
  d += ` L ${run[run.length - 1].x} ${base} Z`;
  return d;
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

function lastSolid(pts: (ChartPoint | null)[]) {
  for (let i = pts.length - 1; i >= 0; i -= 1) {
    if (pts[i]) {
      return pts[i];
    }
  }
  return null;
}

/**
 * Pontos relevantes: mudanças reais de valor + último registro.
 * Em hábitos DIA, evita bolinha a cada conclusão do mesmo %.
 */
function relevantDots(pts: (ChartPoint | null)[], onlyValueChanges: boolean) {
  const out: ChartPoint[] = [];
  let lastValue: number | null = null;
  pts.forEach((point) => {
    if (!point) {
      return;
    }
    if (onlyValueChanges) {
      if (lastValue != null && Math.abs(point.value - lastValue) < 0.001) {
        return;
      }
      lastValue = point.value;
    }
    out.push(point);
  });
  return out;
}

type SeriesMode = 'habits' | 'sleep' | 'mood' | 'all';

/** Gráfico integrado: hábitos verde contínua, sono/humor pontilhados. Escala 0–100%. */
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

  const habitIsStep = lineStyle === 'step' || Boolean(timed?.habits);
  const habitPaths = habitIsStep ? stepPaths(habitPts) : smoothPaths(habitPts);
  // Sono e humor: sempre pontilhados; suaves fora do DIA timed.
  const sleepPaths = timed?.sleep ? smoothPaths(sleepPts) : smoothPaths(sleepPts);
  const moodPaths = timed?.mood ? smoothPaths(moodPts) : smoothPaths(moodPts);
  const habitArea = showHabits
    ? habitIsStep
      ? stepAreaPath(habitPts, height, padY)
      : smoothAreaPath(habitPts, height, padY)
    : null;

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
      relevantDots(habitPts, true).forEach((point, index) => {
        hits.push({
          key: `h-${index}`,
          x: point.x,
          y: point.y,
          color: colors.habits,
          title: fractionLabel(timed.habits?.[point.index]?.fraction ?? 0),
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

  const habitDots = showHabits ? relevantDots(habitPts, habitIsStep) : [];
  const sleepDots = showSleep ? relevantDots(sleepPts, false) : [];
  const moodDots = showMood ? relevantDots(moodPts, false) : [];
  const habitLast = showHabits ? lastSolid(habitPts) : null;
  const sleepLast = showSleep ? lastSolid(sleepPts) : null;
  const moodLast = showMood ? lastSolid(moodPts) : null;

  const goalY = height - padY - (goalPercent / 100) * (height - padY * 2);
  const gradientId = `habit-fill-${highlight}`;

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
              { id: gradientId, x1: '0', y1: '0', x2: '0', y2: '1' },
              createElement('stop', { offset: '0%', stopColor: colors.habits, stopOpacity: '0.42' }),
              createElement('stop', { offset: '45%', stopColor: colors.habits, stopOpacity: '0.16' }),
              createElement('stop', { offset: '100%', stopColor: colors.habits, stopOpacity: '0' }),
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
          // Meta 70% — linha vermelha contínua
          node('line', {
            key: 'goal-70',
            x1: padX,
            y1: goalY,
            x2: width - 8,
            y2: goalY,
            stroke: progressBandColor.red,
            strokeWidth: 1.35,
            opacity: 0.92,
            style: { filter: 'drop-shadow(0 0 2px rgba(255,59,77,0.55))' },
          }),
          node(
            'text',
            {
              key: 'goal-70-label',
              x: width - 10,
              y: goalY - 4,
              fill: progressBandColor.red,
              fontSize: 8,
              fontFamily: 'Manrope, sans-serif',
              textAnchor: 'end',
              opacity: 0.95,
            },
            `META ${goalPercent}%`,
          ),
          // Sombra verde sob hábitos (atrás das demais curvas)
          habitArea
            ? node('path', {
                key: 'habit-area',
                d: habitArea,
                fill: `url(#${gradientId})`,
              })
            : null,
          ...habitPaths.map((d, index) =>
            showHabits
              ? node('path', {
                  key: `h-${index}`,
                  d,
                  fill: 'none',
                  stroke: colors.habits,
                  strokeWidth: highlight === 'habits' ? 2.8 : 2.35,
                  strokeLinejoin: 'round',
                  strokeLinecap: 'round',
                  style: { filter: 'drop-shadow(0 0 5px rgba(57,255,115,0.75))' },
                })
              : null,
          ),
          sleepGhost
            ? node('path', {
                key: 'sleep-ghost',
                d: sleepGhost,
                fill: 'none',
                stroke: colors.sleep,
                strokeWidth: 1.5,
                strokeDasharray: '4 5',
                opacity: 0.4,
              })
            : null,
          moodGhost
            ? node('path', {
                key: 'mood-ghost',
                d: moodGhost,
                fill: 'none',
                stroke: colors.mood,
                strokeWidth: 1.5,
                strokeDasharray: '4 5',
                opacity: 0.4,
              })
            : null,
          ...sleepPaths.map((d, index) =>
            showSleep
              ? node('path', {
                  key: `s-${index}`,
                  d,
                  fill: 'none',
                  stroke: colors.sleep,
                  strokeWidth: highlight === 'sleep' ? 2.2 : 1.85,
                  strokeDasharray: '5 5',
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
                  strokeWidth: highlight === 'mood' ? 2.2 : 1.85,
                  strokeDasharray: '5 5',
                  strokeLinejoin: 'round',
                  strokeLinecap: 'round',
                  style: { filter: 'drop-shadow(0 0 3px rgba(230,193,74,0.55))' },
                })
              : null,
          ),
          // Marcadores discretos (hábitos: só mudanças relevantes; sem cluster)
          ...habitDots.map((point, index) => {
            const isLast = habitLast != null && point.x === habitLast.x && point.y === habitLast.y;
            if (habitIsStep && !isLast) {
              return null;
            }
            return node('circle', {
              key: `hd-${index}`,
              cx: point.x,
              cy: point.y,
              r: isLast ? 4.6 : 2.6,
              fill: isLast ? colors.habits : '#0A0A0A',
              stroke: colors.habits,
              strokeWidth: isLast ? 0 : 1.6,
              style: isLast ? { filter: 'drop-shadow(0 0 6px rgba(57,255,115,0.95))' } : undefined,
            });
          }),
          ...sleepDots.map((point, index) => {
            const isLast = sleepLast != null && point.x === sleepLast.x && point.y === sleepLast.y;
            return node('circle', {
              key: `sd-${index}`,
              cx: point.x,
              cy: point.y,
              r: isLast ? 4.2 : 2.8,
              fill: isLast ? colors.sleep : '#0A0A0A',
              stroke: colors.sleep,
              strokeWidth: isLast ? 0 : 1.5,
              style: isLast ? { filter: 'drop-shadow(0 0 5px rgba(110,182,242,0.9))' } : undefined,
            });
          }),
          ...moodDots.map((point, index) => {
            const isLast = moodLast != null && point.x === moodLast.x && point.y === moodLast.y;
            return node('circle', {
              key: `md-${index}`,
              cx: point.x,
              cy: point.y,
              r: isLast ? 4.2 : 2.8,
              fill: isLast ? colors.mood : '#0A0A0A',
              stroke: colors.mood,
              strokeWidth: isLast ? 0 : 1.5,
              style: isLast ? { filter: 'drop-shadow(0 0 5px rgba(230,193,74,0.9))' } : undefined,
            });
          }),
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
