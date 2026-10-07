import { createElement, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useReducedMotion, useSettledNumbers } from '@/components/motion';
import { fonts, ui } from '@/constants/theme';
import type { PillarReading } from '@/lib/journey-view';

function node(type: string, props: Record<string, unknown> | null, ...children: ReactNode[]) {
  return createElement(type, props, ...children);
}

const center = { x: 100, y: 96 };
const radius = 74;
const vertices = [
  { x: center.x, y: center.y - radius },
  { x: center.x - radius * Math.sin((2 * Math.PI) / 3), y: center.y - radius * Math.cos((2 * Math.PI) / 3) },
  { x: center.x + radius * Math.sin((2 * Math.PI) / 3), y: center.y - radius * Math.cos((2 * Math.PI) / 3) },
];

function at(index: number, percent: number) {
  const vertex = vertices[index];
  const scale = Math.max(0, Math.min(100, percent)) / 100;
  return {
    x: center.x + (vertex.x - center.x) * scale,
    y: center.y + (vertex.y - center.y) * scale,
  };
}

function ring(scale: number) {
  return vertices
    .map((vertex) => {
      const x = center.x + (vertex.x - center.x) * scale;
      const y = center.y + (vertex.y - center.y) * scale;
      return `${x},${y}`;
    })
    .join(' ');
}

export function RadarThreePillars({ readings }: { readings: readonly PillarReading[] }) {
  const reduced = useReducedMotion();
  const order: PillarReading['id'][] = ['corpo', 'mente', 'espirito'];
  const values = order.map((id) => readings.find((item) => item.id === id)?.percent ?? 0);
  const shown = useSettledNumbers(values, reduced);
  const labels = order.map((id) => readings.find((item) => item.id === id));
  const polygon = [0, 1, 2].map((index) => {
    const point = at(index, shown[index] ?? 0);
    return `${point.x},${point.y}`;
  }).join(' ');
  const summary = labels
    .map((item, index) => `${item?.label ?? order[index]} ${Math.round(shown[index] ?? 0)}%`)
    .join(', ');

  return (
    <View accessibilityLabel={`Mapa dos pilares. ${summary}`} style={styles.wrap}>
      <View style={styles.top}>
        <Text style={styles.name}>Corpo</Text>
        <Text style={styles.percent}>{Math.round(shown[0] ?? 0)}%</Text>
      </View>
      <View style={styles.figure}>
        {node(
          'svg',
          {
            viewBox: '0 0 200 188',
            width: '100%',
            height: '100%',
            accessibilityElementsHidden: true,
          },
          node('polygon', { points: ring(1), fill: 'none', stroke: 'rgba(232, 201, 155, 0.28)', strokeWidth: 1 }),
          node('polygon', { points: ring(0.66), fill: 'none', stroke: 'rgba(243, 239, 232, 0.08)', strokeWidth: 1 }),
          node('polygon', { points: ring(0.33), fill: 'none', stroke: 'rgba(243, 239, 232, 0.06)', strokeWidth: 1 }),
          ...vertices.map((vertex, index) =>
            node('line', {
              key: index,
              x1: center.x,
              y1: center.y,
              x2: vertex.x,
              y2: vertex.y,
              stroke: 'rgba(243, 239, 232, 0.08)',
              strokeWidth: 1,
            }),
          ),
          node('polygon', {
            points: polygon,
            fill: 'rgba(232, 201, 155, 0.2)',
            stroke: 'rgba(232, 201, 155, 0.85)',
            strokeWidth: 1.25,
            strokeLinejoin: 'round',
          }),
          ...[0, 1, 2].map((index) => {
            const point = at(index, shown[index] ?? 0);
            return node('g', { key: `dot-${index}` },
              node('circle', { cx: point.x, cy: point.y, r: 5.5, fill: 'rgba(232, 201, 155, 0.28)' }),
              node('circle', { cx: point.x, cy: point.y, r: 2.2, fill: '#F7F1E6' }),
            );
          }),
        )}
      </View>
      <View style={styles.base}>
        <View style={styles.side}>
          <Text style={styles.name}>Mente</Text>
          <Text style={styles.percent}>{Math.round(shown[1] ?? 0)}%</Text>
        </View>
        <View style={[styles.side, styles.sideRight]}>
          <Text style={styles.name}>Espírito</Text>
          <Text style={styles.percent}>{Math.round(shown[2] ?? 0)}%</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
  },
  figure: {
    width: '100%',
    aspectRatio: 200 / 188,
  },
  top: {
    alignItems: 'center',
    marginBottom: 4,
  },
  base: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  side: {
    width: '42%',
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  name: {
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  percent: {
    marginTop: 2,
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 26,
  },
});
