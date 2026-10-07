import { router, type Href } from 'expo-router';
import { createElement, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useReducedMotion, useSettledNumbers } from '@/components/motion';
import { fonts, ui } from '@/constants/theme';
import type { PillarId } from '@/lib/tasks';

const INK = 'rgba(236, 230, 220, 0.9)';
const TRACK = '#2C2926';

function node(type: string, props: Record<string, unknown> | null, ...children: ReactNode[]) {
  return createElement(type, props, ...children);
}

function Figure({ id }: { id: PillarId }) {
  if (Platform.OS !== 'web') {
    return null;
  }
  const mask = `hoje-fade-${id}`;
  const frame = id === 'corpo' ? { w: 220, h: 380 } : { w: 220, h: 210 };
  const body =
    id === 'corpo' ? (
      node(
        'g',
        { fill: INK },
        node('ellipse', { cx: 110, cy: 30, rx: 14, ry: 17 }),
        node('path', { d: 'M99 44h22l-4 32h-14z' }),
        node('path', {
          d: 'M100 72h20l30 26 8 26-10 30-8 24 10 26-32 12H102l-32-12 10-26-10-24-8-30 8-26z',
        }),
        node('path', { d: 'M144 104l34 12-4 88-14 4-8-90z' }),
        node('path', { d: 'M76 104l-34 12 4 88 14 4 8-90z' }),
        node('path', {
          d: 'M116 208l38-10v52l-8 50-8 40-2 16 6 12h-20l4-12 4-16 2-40-4-50-16-42z',
        }),
        node('path', {
          d: 'M104 208l-38-10v52l8 50 8 40 2 16-6 12h20l-4-12-4-16-2-40 4-50 16-42z',
        }),
      )
    ) : id === 'mente' ? (
      node(
        'g',
        { fill: 'none', stroke: INK, strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' },
        node('path', {
          d: 'M110 28c-22 0-40 16-46 36-14 4-24 18-22 34 2 14 12 24 26 28 6 18 22 32 42 34V42',
        }),
        node('path', {
          d: 'M110 28c22 0 40 16 46 36 14 4 24 18 22 34-2 14-12 24-26 28-6 18-22 32-42 34V42',
        }),
        node('path', { d: 'M110 40v112' }),
        node('path', { d: 'M78 62c10 8 12 22 2 32' }),
        node('path', { d: 'M142 62c-10 8-12 22-2 32' }),
        node('path', { d: 'M74 102c12 6 14 20 4 30' }),
        node('path', { d: 'M146 102c-12 6-14 20-4 30' }),
        node('path', { d: 'M86 132c8 6 10 16 2 22' }),
        node('path', { d: 'M134 132c-8 6-10 16-2 22' }),
      )
    ) : (
      node(
        'g',
        { fill: 'none', stroke: INK, strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
        node('path', { d: 'M110 168c-28-10-58-8-78-28 22-2 40 8 52 24' }),
        node('path', { d: 'M110 168c28-10 58-8 78-28-22-2-40 8-52 24' }),
        node('path', { d: 'M110 164c-18-22-24-52-8-78 10 24 14 48 16 70' }),
        node('path', { d: 'M110 164c18-22 24-52 8-78-10 24-14 48-16 70' }),
        node('path', { d: 'M110 158c-6-28-4-58 8-84 2 28 0 54-2 76' }),
        node('path', { d: 'M110 158c6-28 4-58-8-84-2 28 0 54 2 76' }),
        node('path', { d: 'M110 170c-8 10-6 22 2 28' }),
        node('path', { d: 'M110 170c8 10 6 22-2 28' }),
      )
    );

  return (
    <View pointerEvents="none" style={styles.figure}>
      {node(
        'svg',
        {
          width: '100%',
          height: '100%',
          viewBox: `0 0 ${frame.w} ${frame.h}`,
          preserveAspectRatio: 'xMidYMid meet',
          'aria-hidden': true,
        },
        node(
          'defs',
          null,
          node(
            'linearGradient',
            { id: mask, x1: '0', y1: '0', x2: '1', y2: '0' },
            node('stop', { offset: '0%', stopColor: '#FFFFFF', stopOpacity: '0' }),
            node('stop', { offset: '28%', stopColor: '#FFFFFF', stopOpacity: '0.35' }),
            node('stop', { offset: '100%', stopColor: '#FFFFFF', stopOpacity: '1' }),
          ),
          node('mask', { id: `${mask}-m` }, node('rect', { width: frame.w, height: frame.h, fill: `url(#${mask})` })),
          node(
            'filter',
            { id: `${mask}-soft`, x: '-12%', y: '-8%', width: '124%', height: '116%' },
            node('feGaussianBlur', { stdDeviation: id === 'corpo' ? '1.15' : '0.35' }),
          ),
        ),
        node('g', { mask: `url(#${mask}-m)`, filter: `url(#${mask}-soft)`, opacity: 0.15 }, body),
      )}
    </View>
  );
}

function ringTone(percent: number) {
  if (percent < 1) {
    return null;
  }
  if (percent >= 70) {
    return { line: '#6AAA62', glow: 'rgba(106, 170, 98, 0.5)' };
  }
  if (percent >= 50) {
    return { line: '#E4C36A', glow: 'rgba(228, 195, 106, 0.48)' };
  }
  return { line: '#C45148', glow: 'rgba(196, 81, 72, 0.5)' };
}

function Ring({ percent }: { percent: number }) {
  const tone = ringTone(percent);
  const size = 54;
  const stroke = 2;
  const radius = (size - stroke) / 2 - 1;
  const center = size / 2;
  const turn = 2 * Math.PI * radius;
  const offset = turn * (1 - Math.min(100, Math.max(0, percent)) / 100);

  if (Platform.OS !== 'web') {
    return <View style={[styles.ringFallback, { borderColor: tone?.line ?? TRACK }]} />;
  }

  return (
    <View style={styles.ring}>
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
              style: { filter: `drop-shadow(0 0 2px ${tone.glow})` },
            })
          : null,
      )}
    </View>
  );
}

export function PillarCard({
  id,
  label,
  percent,
  stacked,
}: {
  id: PillarId;
  label: string;
  percent: number;
  stacked: boolean;
}) {
  const reduced = useReducedMotion();
  const safe = Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 0;
  const [shown = 0] = useSettledNumbers([safe], reduced);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${Math.round(safe)}%. Ver hábitos`}
      onPress={() => router.push(`/pilar/${id}` as Href)}
      style={({ pressed }) => [styles.card, stacked && styles.cardStacked, pressed && styles.pressed]}>
      <Figure id={id} />
      <View style={styles.copy}>
        <Text style={styles.name} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.value}>{Math.round(safe)}%</Text>
        <Ring percent={shown} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    minHeight: 248,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(243, 239, 232, 0.07)',
    backgroundColor: 'rgba(16, 14, 12, 0.72)',
    overflow: 'hidden',
    paddingHorizontal: 22,
    paddingVertical: 22,
  },
  cardStacked: {
    minHeight: 188,
    flex: 0,
  },
  figure: {
    position: 'absolute',
    top: 0,
    right: -10,
    width: '74%',
    height: '108%',
  },
  copy: {
    zIndex: 1,
    alignItems: 'flex-start',
    gap: 8,
    maxWidth: '58%',
  },
  name: {
    color: ui.champagne,
    fontFamily: fonts.text,
    fontSize: 11,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
  value: {
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: 0.4,
  },
  ring: {
    marginTop: 8,
    width: 54,
    height: 54,
  },
  ringFallback: {
    marginTop: 8,
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
  },
  pressed: {
    opacity: 0.82,
  },
});
