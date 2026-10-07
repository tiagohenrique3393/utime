import { router, type Href } from 'expo-router';
import { createElement, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useReducedMotion, useSettledNumbers } from '@/components/motion';
import { fonts, ui } from '@/constants/theme';
import type { PillarId } from '@/lib/tasks';

const INK = 'rgba(236, 230, 220, 0.9)';
const TRACK = '#2C2926';

function node(type: string, props: Record<string, unknown> | null, ...children: ReactNode[]) {
  return createElement(type, props, ...children);
}

function MaleBody() {
  return node(
    'g',
    { fill: INK },
    node('ellipse', { cx: 110, cy: 28, rx: 13, ry: 16 }),
    node('path', { d: 'M100 42h20l-3 28h-14z' }),
    node('path', {
      d: 'M102 68h16l32 24 8 24-12 28-10 22 12 24-30 12H92l-30-12 12-24-10-22-12-28 8-24z',
    }),
    node('path', { d: 'M146 96l32 10-2 78-12 4-10-80z' }),
    node('path', { d: 'M74 96l-32 10 2 78 12 4 10-80z' }),
    node('path', { d: 'M114 196l36-8v48l-8 46-6 36-2 14 6 10h-18l-4-12 4-36 2-46-4-48z' }),
    node('path', { d: 'M106 196l-36-8v48l8 46 6 36 2 14-6 10h18l4-12-4-36-2-46 4-48z' }),
  );
}

function FemaleBody() {
  return node(
    'g',
    { fill: INK },
    node('path', { d: 'M98 8c8-6 18-6 24 2 4 6 2 12-2 16-6 2-8 6-6 12 6 2 10 8 8 16-8 4-22 4-28-2-4-8-2-16 4-20 2-8-2-16 0-24z' }),
    node('ellipse', { cx: 110, cy: 36, rx: 11, ry: 13 }),
    node('path', { d: 'M104 48h12l-1 16h-10z' }),
    node('path', {
      d: 'M86 78c10-16 18-22 24-22s14 6 24 22c6 10 10 16 8 26-4 14-12 22-8 36 4 12 12 20 18 30 4 8 0 16-8 18l-18 6h-32l-18-6c-8-2-12-10-8-18 6-10 14-18 18-30 4-14-4-22-8-36-2-10 2-16 8-26z',
    }),
    node('path', { d: 'M132 92c14 8 18 22 14 40-4 16-8 32-10 46-2 6-8 4-8-2 2-16 4-32 2-44-2-12-6-22-8-30-2-6 4-12 10-10z' }),
    node('path', { d: 'M88 92c-14 8-18 22-14 40 4 16 8 32 10 46 2 6 8 4 8-2-2-16-4-32-2-44 2-12 6-22 8-30 2-6-4-12-10-10z' }),
    node('path', { d: 'M122 188c18 4 26 16 24 34-2 28-8 58-12 86-2 10-6 16-2 20h-14c2-8 2-16 0-28-4-24-6-52-4-78 2-16-2-32 8-34z' }),
    node('path', { d: 'M98 188c-18 4-26 16-24 34 2 28 8 58 12 86 2 10 6 16 2 20h14c-2-8-2-16 0-28 4-24 6-52 4-78-2-16 2-32-8-34z' }),
  );
}

function Figure({ id, feminine }: { id: PillarId; feminine: boolean }) {
  if (Platform.OS !== 'web') {
    return null;
  }
  const mask = `hoje-fade-${id}`;
  const frame = id === 'corpo' ? { w: 220, h: 360 } : { w: 220, h: 210 };
  const body =
    id === 'corpo' ? (
      feminine ? <FemaleBody /> : <MaleBody />
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
          preserveAspectRatio: 'xMaxYMid meet',
          'aria-hidden': true,
        },
        node(
          'defs',
          null,
          node(
            'linearGradient',
            { id: mask, x1: '0', y1: '0', x2: '1', y2: '0' },
            node('stop', { offset: '0%', stopColor: '#FFFFFF', stopOpacity: '0' }),
            node('stop', { offset: '42%', stopColor: '#FFFFFF', stopOpacity: '0.2' }),
            node('stop', { offset: '100%', stopColor: '#FFFFFF', stopOpacity: '1' }),
          ),
          node('mask', { id: `${mask}-m` }, node('rect', { width: frame.w, height: frame.h, fill: `url(#${mask})` })),
        ),
        node('g', { mask: `url(#${mask}-m)`, opacity: 0.14 }, body),
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
  const size = 30;
  const stroke = 1.6;
  const radius = (size - stroke) / 2 - 0.4;
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
  feminine = false,
}: {
  id: PillarId;
  label: string;
  percent: number;
  feminine?: boolean;
}) {
  const reduced = useReducedMotion();
  const { width } = useWindowDimensions();
  const tablet = width >= 760;
  const safe = Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 0;
  const [shown = 0] = useSettledNumbers([safe], reduced);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${Math.round(safe)}%. Ver hábitos`}
      onPress={() => router.push(`/pilar/${id}` as Href)}
      style={({ pressed }) => [styles.card, tablet ? styles.cardTablet : styles.cardPhone, pressed && styles.pressed]}>
      <Figure id={id} feminine={feminine} />
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
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '31%',
    maxWidth: '32.4%',
    minWidth: 0,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(243, 239, 232, 0.07)',
    backgroundColor: 'rgba(16, 14, 12, 0.62)',
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  cardPhone: {
    height: 128,
  },
  cardTablet: {
    height: 146,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  figure: {
    position: 'absolute',
    top: 4,
    right: -4,
    width: '58%',
    height: '108%',
  },
  copy: {
    zIndex: 1,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    height: '100%',
    maxWidth: '72%',
  },
  name: {
    color: ui.champagne,
    fontFamily: fonts.text,
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  value: {
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: 0.3,
  },
  ring: {
    width: 30,
    height: 30,
  },
  ringFallback: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.6,
  },
  pressed: {
    opacity: 0.82,
  },
});
