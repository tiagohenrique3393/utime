import { createElement, type ReactNode } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { progressTone } from '@/components/day-progress';
import { useReducedMotion, useSettledNumbers } from '@/components/motion';
import { fonts, ui } from '@/constants/theme';
import type { PillarId } from '@/lib/tasks';

const ICON = 'rgba(236, 230, 220, 0.86)';
const TRACK = '#2A2724';

function node(type: string, props: Record<string, unknown> | null, ...children: ReactNode[]) {
  return createElement(type, props, ...children);
}

function BodyIcon() {
  const stroke = { fill: 'none', stroke: ICON, strokeWidth: 1.35, strokeLinecap: 'round', strokeLinejoin: 'round' };
  return node(
    'svg',
    { width: 22, height: 36, viewBox: '0 0 40 64', 'aria-hidden': true },
    node('circle', { cx: 20, cy: 7, r: 3.5, ...stroke }),
    node('path', { d: 'M20 10.6 V14.2', ...stroke }),
    node('path', { d: 'M10.2 19 C13.2 15.2 16.4 14.2 20 14.2 C23.6 14.2 26.8 15.2 29.8 19', ...stroke }),
    node('path', { d: 'M10.2 19 L7 33.5', ...stroke }),
    node('path', { d: 'M29.8 19 L33 33.5', ...stroke }),
    node('path', { d: 'M15.2 18.8 C15.4 28 16.2 36 16.6 42', ...stroke }),
    node('path', { d: 'M24.8 18.8 C24.6 28 23.8 36 23.4 42', ...stroke }),
    node('path', { d: 'M16.6 42 L15 58', ...stroke }),
    node('path', { d: 'M23.4 42 L25 58', ...stroke }),
  );
}

function BrainIcon() {
  return node(
    'svg',
    { width: 30, height: 30, viewBox: '0 0 48 48', fill: 'none', 'aria-hidden': true },
    node('path', {
      d: 'M24 8c-3.4 0-6.2 2.2-7.2 5.2C14.2 13 12 15 12 17.8c0 1.6.7 3 1.8 4-1.6.8-2.8 2.4-2.8 4.3 0 2.2 1.5 4 3.6 4.6.7 2.6 3 4.5 5.8 4.8V14.2',
      stroke: ICON,
      strokeWidth: 1.3,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    }),
    node('path', {
      d: 'M24 8c3.4 0 6.2 2.2 7.2 5.2C33.8 13 36 15 36 17.8c0 1.6-.7 3-1.8 4 1.6.8 2.8 2.4 2.8 4.3 0 2.2-1.5 4-3.6 4.6-.7 2.6-3 4.5-5.8 4.8V14.2',
      stroke: ICON,
      strokeWidth: 1.3,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    }),
    node('path', {
      d: 'M18.5 18.5c1.2.8 1.6 2.2.6 3.4M29.5 18.5c-1.2.8-1.6 2.2-.6 3.4M18.2 25.5c1.1.6 1.5 1.8.7 2.8M29.8 25.5c-1.1.6-1.5 1.8-.7 2.8',
      stroke: ICON,
      strokeWidth: 1.1,
      strokeLinecap: 'round',
    }),
    node('path', { d: 'M24 12.5v22', stroke: ICON, strokeWidth: 1.1, strokeLinecap: 'round' }),
  );
}

function LotusIcon() {
  const petals = [-62, -32, 0, 32, 62];
  return node(
    'svg',
    { width: 30, height: 30, viewBox: '0 0 48 48', fill: 'none', 'aria-hidden': true },
    ...petals.map((turn) =>
      node('ellipse', {
        key: turn,
        cx: 24,
        cy: 18,
        rx: 3.4,
        ry: 9,
        stroke: ICON,
        strokeWidth: 1.15,
        transform: `rotate(${turn} 24 32)`,
      }),
    ),
  );
}

function Texture({ id }: { id: PillarId }) {
  if (Platform.OS !== 'web') {
    return null;
  }
  const lines =
    id === 'corpo'
      ? ['M-4 34 Q40 18 120 36', 'M-8 52 Q48 34 124 56', 'M0 70 Q52 54 120 74']
      : id === 'mente'
        ? ['M8 20 Q40 8 78 24', 'M4 48 Q46 28 96 46', 'M20 72 Q58 58 100 78']
        : ['M18 18c14 8 22 8 36-2', 'M10 46c18 10 34 8 52-6', 'M24 74c12 4 24 2 36-8'];
  return (
    <View pointerEvents="none" style={styles.texture}>
      {node(
        'svg',
        { width: '100%', height: '100%', viewBox: '0 0 120 120', preserveAspectRatio: 'xMidYMid slice', 'aria-hidden': true },
        node(
          'defs',
          null,
          node(
            'radialGradient',
            { id: `hoje-card-${id}`, cx: '50%', cy: '38%', r: '68%' },
            node('stop', { offset: '0%', stopColor: '#1A1714', stopOpacity: '0.9' }),
            node('stop', { offset: '100%', stopColor: '#000000', stopOpacity: '0' }),
          ),
        ),
        node('rect', { width: '120', height: '120', fill: `url(#hoje-card-${id})` }),
        ...lines.map((d) =>
          node('path', {
            key: d,
            d,
            fill: 'none',
            stroke: 'rgba(232, 201, 155, 0.07)',
            strokeWidth: 1,
          }),
        ),
      )}
    </View>
  );
}

function Ring({ id, percent, size }: { id: PillarId; percent: number; size: number }) {
  const tone = progressTone(percent);
  const stroke = 2.2;
  const radius = (size - stroke) / 2 - 1;
  const center = size / 2;
  const turn = 2 * Math.PI * radius;
  const offset = turn * (1 - Math.min(100, Math.max(0, percent)) / 100);
  const icon = id === 'corpo' ? <BodyIcon /> : id === 'mente' ? <BrainIcon /> : <LotusIcon />;

  if (Platform.OS !== 'web') {
    return (
      <View
        style={[
          styles.ringFallback,
          { width: size, height: size, borderRadius: size / 2, borderColor: tone?.line ?? TRACK },
        ]}>
        {icon}
      </View>
    );
  }

  const end = -Math.PI / 2 + (Math.min(100, Math.max(0, percent)) / 100) * Math.PI * 2;
  const dotX = center + radius * Math.cos(end);
  const dotY = center + radius * Math.sin(end);

  return (
    <View style={{ width: size, height: size }}>
      {node(
        'svg',
        { width: size, height: size, viewBox: `0 0 ${size} ${size}`, 'aria-hidden': true },
        node('circle', { cx: center, cy: center, r: radius, fill: 'none', stroke: TRACK, strokeWidth: stroke }),
        tone
          ? node('circle', {
              cx: center,
              cy: center,
              r: radius,
              fill: 'none',
              stroke: tone.line,
              strokeWidth: stroke,
              strokeLinecap: 'round',
              strokeDasharray: `${turn} ${turn}`,
              strokeDashoffset: offset,
              transform: `rotate(-90 ${center} ${center})`,
              style: { filter: `drop-shadow(0 0 2.5px ${tone.glow})` },
            })
          : null,
        tone
          ? node('circle', {
              cx: dotX,
              cy: dotY,
              r: 1.7,
              fill: '#F8F3EA',
              style: { filter: `drop-shadow(0 0 3px ${tone.glow})` },
            })
          : null,
      )}
      <View style={styles.icon}>{icon}</View>
    </View>
  );
}

export function PillarCard({ id, label, percent, size }: { id: PillarId; label: string; percent: number; size: number }) {
  const reduced = useReducedMotion();
  const safe = Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 0;
  const [shown = 0] = useSettledNumbers([safe], reduced);

  return (
    <View style={styles.card} accessibilityLabel={`${label} ${Math.round(safe)}%`}>
      <Texture id={id} />
      <Ring id={id} percent={shown} size={size} />
      <Text style={styles.value}>{Math.round(shown)}%</Text>
      <Text style={styles.name} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 8,
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 4,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(243, 239, 232, 0.08)',
    backgroundColor: 'rgba(14, 12, 11, 0.72)',
    overflow: 'hidden',
  },
  texture: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  ringFallback: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 18,
    lineHeight: 22,
  },
  name: {
    color: ui.muted,
    fontFamily: fonts.text,
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
});
