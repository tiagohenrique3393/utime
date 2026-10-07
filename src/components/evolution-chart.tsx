import { createElement, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fonts, ui } from '@/constants/theme';
import type { ChartPoint } from '@/lib/journey-view';

function node(type: string, props: Record<string, unknown> | null, ...children: ReactNode[]) {
  return createElement(type, props, ...children);
}

export function EvolutionChart({ points }: { points: readonly ChartPoint[] }) {
  const width = 320;
  const height = 132;
  const padX = 8;
  const padY = 12;
  const count = points.length;

  if (count === 0) {
    return <Text style={styles.empty}>Este período ainda não tem dias da jornada.</Text>;
  }

  const coordinates = points.map((point, index) => {
    const x = count === 1 ? width / 2 : padX + (index * (width - padX * 2)) / (count - 1);
    const y = height - padY - (Math.max(0, Math.min(100, point.value)) / 100) * (height - padY * 2);
    return { x, y };
  });
  const line = coordinates.map((point) => `${point.x},${point.y}`).join(' ');
  const area = `${coordinates[0].x},${height - padY} ${line} ${coordinates[count - 1].x},${height - padY}`;
  const first = points[0];
  const last = points[count - 1];
  const summary = `Evolução de ${first.label} a ${last.label}. Início ${Math.round(first.value)}%. Agora ${Math.round(last.value)}%.`;

  return (
    <View accessibilityLabel={summary}>
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
          node('polygon', { points: area, fill: 'rgba(232, 201, 155, 0.14)' }),
          node('polyline', {
            points: line,
            fill: 'none',
            stroke: '#E8C99B',
            strokeWidth: 1.4,
            strokeLinejoin: 'round',
            strokeLinecap: 'round',
          }),
          node('circle', {
            cx: coordinates[count - 1].x,
            cy: coordinates[count - 1].y,
            r: 2.4,
            fill: '#F7F1E6',
          }),
        )}
      </View>
      <View style={styles.axis}>
        <Text style={styles.tick}>{first.label}</Text>
        <Text style={styles.tick}>{last.label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  figure: {
    width: '100%',
    aspectRatio: 320 / 132,
  },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  tick: {
    color: ui.faint,
    fontFamily: fonts.text,
    fontSize: 11,
    letterSpacing: 0.6,
  },
  empty: {
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 14,
    lineHeight: 20,
  },
});
