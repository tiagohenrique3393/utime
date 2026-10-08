import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { createElement, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useReducedMotion, useSettledNumbers } from '@/components/motion';
import { fonts } from '@/constants/theme';
import { getProgressColor } from '@/lib/progress-color';
import type { PillarId } from '@/lib/tasks';

const corpoMale = require('@/assets/pillars/corpo-mantime.png');
const corpoFemale = require('@/assets/pillars/corpo-womantime.png');
const menteFigure = require('@/assets/pillars/mente.png');
const espiritoFigure = require('@/assets/pillars/espirito.png');

const TRACK = 'rgba(255,255,255,0.14)';

const bands = {
  red: { line: '#F90F0F', glow: 'rgba(249, 15, 15, 0.9)' },
  yellow: { line: '#F5C518', glow: 'rgba(245, 197, 24, 0.9)' },
  green: { line: '#18F54B', glow: 'rgba(24, 245, 75, 0.9)' },
} as const;

function node(type: string, props: Record<string, unknown> | null, ...children: ReactNode[]) {
  return createElement(type, props, ...children);
}

function bandFor(percent: number) {
  return bands[getProgressColor(percent)];
}

function figureFor(id: PillarId, feminine: boolean) {
  if (id === 'corpo') {
    return feminine ? corpoFemale : corpoMale;
  }
  if (id === 'mente') {
    return menteFigure;
  }
  return espiritoFigure;
}

function Ring({ id, percent, size }: { id: PillarId; percent: number; size: number }) {
  const clamped = Math.min(100, Math.max(0, percent));
  const tone = clamped >= 0.5 ? bandFor(clamped) : null;
  const stroke = Math.max(1.8, size * 0.024);
  const radius = size / 2 - stroke * 2.2;
  const center = size / 2;
  const turn = 2 * Math.PI * radius;
  const offset = turn * (1 - clamped / 100);
  const angle = -Math.PI / 2 + (clamped / 100) * Math.PI * 2;
  const tipX = center + radius * Math.cos(angle);
  const tipY = center + radius * Math.sin(angle);
  const glowId = `hoje-ring-${id}`;
  const arc = {
    cx: center,
    cy: center,
    r: radius,
    fill: 'none',
    strokeLinecap: 'round',
    strokeDasharray: `${turn} ${turn}`,
    strokeDashoffset: offset,
    transform: `rotate(-90 ${center} ${center})`,
  };

  if (Platform.OS !== 'web') {
    return <View style={[styles.ringFallback, { borderColor: tone?.line ?? TRACK, borderRadius: size / 2 }]} />;
  }

  return node(
    'svg',
    {
      width: size,
      height: size,
      viewBox: `0 0 ${size} ${size}`,
      'aria-hidden': true,
      style: { position: 'absolute', top: 0, left: 0, overflow: 'visible' },
    },
    node(
      'defs',
      null,
      node(
        'filter',
        { id: glowId, x: '-80%', y: '-80%', width: '260%', height: '260%' },
        node('feGaussianBlur', { stdDeviation: String(Math.max(1.2, size * 0.018)), result: 'blur' }),
        node('feMerge', null, node('feMergeNode', { in: 'blur' }), node('feMergeNode', { in: 'SourceGraphic' })),
      ),
    ),
    node('circle', {
      cx: center,
      cy: center,
      r: radius,
      fill: 'none',
      stroke: TRACK,
      strokeWidth: Math.max(1, stroke * 0.7),
    }),
    tone
      ? node('circle', {
          ...arc,
          stroke: tone.line,
          strokeWidth: stroke * 2.6,
          opacity: 0.28,
        })
      : null,
    tone
      ? node('circle', {
          ...arc,
          stroke: tone.line,
          strokeWidth: stroke,
          filter: `url(#${glowId})`,
        })
      : null,
    tone
      ? node('circle', {
          cx: tipX,
          cy: tipY,
          r: Math.max(4.2, stroke * 2.4),
          fill: tone.line,
          opacity: 0.95,
          filter: `url(#${glowId})`,
        })
      : null,
    tone
      ? node('circle', {
          cx: tipX,
          cy: tipY,
          r: Math.max(2.1, stroke * 1.15),
          fill: '#F8F6F1',
        })
      : null,
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
  const tone = bandFor(safe);
  const dial = tablet ? 100 : 80;
  const inset = dial * 0.085;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${Math.round(safe)}%. Ver hábitos`}
      onPress={() => router.push(`/pilar/${id}` as Href)}
      style={({ pressed }) => [styles.card, tablet ? styles.cardTablet : styles.cardPhone, pressed && styles.pressed]}>
      <View style={[styles.dial, { width: dial, height: dial }]}>
        <View style={[styles.portrait, { top: inset, right: inset, bottom: inset, left: inset }]}>
          <Image source={figureFor(id, feminine)} contentFit="cover" style={styles.portraitImage} />
        </View>
        <Ring id={id} percent={shown} size={dial} />
      </View>
      <Text style={[styles.name, tablet && styles.nameTablet]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.value, tablet && styles.valueTablet, { color: tone.line }]}>{Math.round(safe)}%</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  cardPhone: {
    height: 136,
    paddingTop: 6,
    paddingBottom: 7,
    paddingHorizontal: 2,
  },
  cardTablet: {
    height: 156,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 6,
  },
  dial: {
    position: 'relative',
  },
  portrait: {
    position: 'absolute',
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#05070b',
  },
  portraitImage: {
    width: '100%',
    height: '100%',
  },
  ringFallback: {
    ...StyleSheet.absoluteFill,
    borderWidth: 2,
  },
  name: {
    color: '#F7F4EC',
    fontFamily: fonts.display,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  nameTablet: {
    fontSize: 12,
    lineHeight: 15,
    letterSpacing: 2.2,
  },
  value: {
    fontFamily: fonts.textLight,
    fontSize: 12,
    lineHeight: 15,
    letterSpacing: 0.6,
  },
  valueTablet: {
    fontSize: 14,
    lineHeight: 17,
  },
  pressed: {
    opacity: 0.82,
  },
});
