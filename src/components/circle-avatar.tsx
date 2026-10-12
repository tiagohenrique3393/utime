import { createElement, useId } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { circlePalette } from '@/components/circle-palette';

function WebAvatar({ size, glow }: { size: number; glow: boolean }) {
  const id = useId().replace(/:/g, '');
  const glowId = `${id}-glow`;
  const fillId = `${id}-fill`;
  return createElement(
    'svg',
    { width: size, height: size, viewBox: '0 0 64 64', 'aria-hidden': true },
    createElement(
      'defs',
      null,
      createElement(
        'radialGradient',
        { id: fillId, cx: '50%', cy: '42%', r: '68%' },
        createElement('stop', { offset: '0%', stopColor: '#3a3124' }),
        createElement('stop', { offset: '68%', stopColor: '#100e0c' }),
      ),
      glow
        ? createElement(
            'filter',
            { id: glowId, x: '-40%', y: '-40%', width: '180%', height: '180%' },
            createElement('feDropShadow', { dx: '0', dy: '0', stdDeviation: '2.2', floodColor: circlePalette.champagne, floodOpacity: '0.75' }),
          )
        : null,
    ),
    glow
      ? createElement('circle', {
          cx: 32,
          cy: 32,
          r: 30,
          fill: 'none',
          stroke: circlePalette.champagne,
          strokeWidth: 3.2,
          opacity: 0.28,
          filter: `url(#${glowId})`,
        })
      : null,
    createElement('circle', {
      cx: 32,
      cy: 32,
      r: 28.4,
      fill: `url(#${fillId})`,
      stroke: circlePalette.champagne,
      strokeWidth: glow ? 1.6 : 1.2,
    }),
    createElement('circle', { cx: 32, cy: 22.5, r: 8.4, fill: '#0A0908' }),
    createElement('path', { d: 'M15 55.5c1.6-12.5 7.2-18.2 17-18.2s15.4 5.7 17 18.2c-5.4 3.6-11 5.2-17 5.2s-11.6-1.6-17-5.2Z', fill: '#0A0908' }),
  );
}

export function CircleAvatar({ size = 36, glow = false }: { size?: number; glow?: boolean }) {
  if (Platform.OS === 'web') {
    return <WebAvatar size={size} glow={glow || size >= 48} />;
  }
  return (
    <View style={[styles.ring, glow && styles.glow, { width: size, height: size, borderRadius: size / 2 }]}>
      <View style={[styles.head, { width: size * 0.3, height: size * 0.3, marginTop: size * 0.18 }]} />
      <View style={[styles.shoulders, { width: size * 0.56, height: size * 0.24, marginTop: size * 0.05 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: circlePalette.champagne,
    backgroundColor: '#16130F',
  },
  glow: {
    boxShadow: '0 0 12px rgba(232, 200, 142, 0.45)',
  },
  head: {
    borderRadius: 999,
    backgroundColor: '#070605',
  },
  shoulders: {
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
    backgroundColor: '#070605',
  },
});
