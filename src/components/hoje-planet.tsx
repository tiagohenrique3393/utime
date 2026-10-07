import { createElement, type ReactNode } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';

function node(type: string, props: Record<string, unknown> | null, ...children: ReactNode[]) {
  return createElement(type, props, ...children);
}

/** Tiny urban lights — nearly invisible champagne points on the dark limb. */
const CITY_LIGHTS: [number, number, number][] = [
  [108, 158, 1.1],
  [136, 142, 0.9],
  [162, 168, 1],
  [188, 138, 0.8],
  [214, 156, 1],
  [238, 174, 0.85],
  [258, 144, 0.9],
  [282, 162, 0.75],
  [304, 186, 0.85],
  [122, 194, 0.7],
  [154, 204, 0.65],
  [196, 188, 0.75],
  [226, 210, 0.55],
  [266, 198, 0.7],
  [174, 226, 0.5],
  [210, 238, 0.45],
  [248, 228, 0.5],
  [144, 176, 0.65],
  [278, 218, 0.45],
  [296, 150, 0.55],
];

export function HojePlanet() {
  const { width, height } = useWindowDimensions();
  const planetHeight = Math.round(Math.min(Math.max(height * 0.38, 240), 340));

  if (Platform.OS !== 'web') {
    return <View pointerEvents="none" style={[styles.slot, { height: planetHeight }]} />;
  }

  return (
    <View pointerEvents="none" style={[styles.slot, { height: planetHeight, width }]}>
      {node(
        'svg',
        {
          viewBox: '0 0 390 420',
          width: '100%',
          height: '100%',
          preserveAspectRatio: 'xMidYMin slice',
          fill: 'none',
          'aria-hidden': true,
          style: { display: 'block', overflow: 'hidden', background: 'none' },
        },
        node(
          'defs',
          null,
          node(
            'radialGradient',
            { id: 'hoje-body', cx: '58%', cy: '32%', r: '68%' },
            node('stop', { offset: '0%', stopColor: '#24201A', stopOpacity: '1' }),
            node('stop', { offset: '28%', stopColor: '#161310', stopOpacity: '1' }),
            node('stop', { offset: '62%', stopColor: '#0A0908', stopOpacity: '1' }),
            node('stop', { offset: '100%', stopColor: '#000000', stopOpacity: '1' }),
          ),
          node(
            'radialGradient',
            { id: 'hoje-limb', cx: '70%', cy: '22%', r: '55%' },
            node('stop', { offset: '0%', stopColor: '#3A3228', stopOpacity: '0.42' }),
            node('stop', { offset: '35%', stopColor: '#1E1A15', stopOpacity: '0.18' }),
            node('stop', { offset: '100%', stopColor: '#000000', stopOpacity: '0' }),
          ),
          node(
            'radialGradient',
            { id: 'hoje-sun', cx: '50%', cy: '58%', r: '50%' },
            node('stop', { offset: '0%', stopColor: '#F8F3EA', stopOpacity: '0.48' }),
            node('stop', { offset: '12%', stopColor: '#E8C99B', stopOpacity: '0.2' }),
            node('stop', { offset: '32%', stopColor: '#E8C99B', stopOpacity: '0.06' }),
            node('stop', { offset: '58%', stopColor: '#C4A574', stopOpacity: '0.02' }),
            node('stop', { offset: '100%', stopColor: '#E8C99B', stopOpacity: '0' }),
          ),
          node(
            'radialGradient',
            { id: 'hoje-glow', cx: '78%', cy: '30%', r: '52%' },
            node('stop', { offset: '0%', stopColor: '#E8C99B', stopOpacity: '0.16' }),
            node('stop', { offset: '30%', stopColor: '#C4A574', stopOpacity: '0.06' }),
            node('stop', { offset: '100%', stopColor: '#000000', stopOpacity: '0' }),
          ),
          node(
            'linearGradient',
            { id: 'hoje-rim', x1: '0', y1: '0', x2: '1', y2: '0' },
            node('stop', { offset: '0%', stopColor: '#E8C99B', stopOpacity: '0' }),
            node('stop', { offset: '22%', stopColor: '#C4A574', stopOpacity: '0.05' }),
            node('stop', { offset: '48%', stopColor: '#E8C99B', stopOpacity: '0.14' }),
            node('stop', { offset: '68%', stopColor: '#F7F1E6', stopOpacity: '0.32' }),
            node('stop', { offset: '82%', stopColor: '#E8C99B', stopOpacity: '0.12' }),
            node('stop', { offset: '100%', stopColor: '#E8C99B', stopOpacity: '0' }),
          ),
          node(
            'linearGradient',
            { id: 'hoje-fade', x1: '0', y1: '0', x2: '0', y2: '1' },
            node('stop', { offset: '0%', stopColor: '#FFFFFF', stopOpacity: '1' }),
            node('stop', { offset: '38%', stopColor: '#FFFFFF', stopOpacity: '0.9' }),
            node('stop', { offset: '62%', stopColor: '#FFFFFF', stopOpacity: '0.4' }),
            node('stop', { offset: '84%', stopColor: '#FFFFFF', stopOpacity: '0.1' }),
            node('stop', { offset: '100%', stopColor: '#FFFFFF', stopOpacity: '0' }),
          ),
          node('mask', { id: 'hoje-fade-mask' }, node('rect', { width: '390', height: '420', fill: 'url(#hoje-fade)' })),
          node(
            'filter',
            { id: 'hoje-soft', x: '-40%', y: '-40%', width: '180%', height: '180%' },
            node('feGaussianBlur', { stdDeviation: '2.4' }),
          ),
          node(
            'filter',
            { id: 'hoje-haze', x: '-25%', y: '-25%', width: '150%', height: '150%' },
            node('feGaussianBlur', { stdDeviation: '10' }),
          ),
        ),
        node(
          'g',
          { mask: 'url(#hoje-fade-mask)' },
          node('ellipse', {
            cx: 292,
            cy: 52,
            rx: 132,
            ry: 62,
            fill: 'url(#hoje-glow)',
            filter: 'url(#hoje-haze)',
          }),
          node('ellipse', {
            cx: 308,
            cy: 68,
            rx: 58,
            ry: 18,
            fill: 'url(#hoje-sun)',
            filter: 'url(#hoje-soft)',
          }),
          node('circle', { cx: 195, cy: 332, r: 268, fill: 'url(#hoje-body)' }),
          node('circle', { cx: 195, cy: 332, r: 268, fill: 'url(#hoje-limb)' }),
          node('circle', {
            cx: 195,
            cy: 332,
            r: 266.5,
            stroke: 'url(#hoje-rim)',
            strokeWidth: 1.15,
          }),
          node('path', {
            d: 'M28 262 Q110 206 168 248 Q214 282 262 244 Q312 198 368 260',
            stroke: 'rgba(232, 201, 155, 0.04)',
            strokeWidth: 12,
            strokeLinecap: 'round',
            fill: 'none',
          }),
          node('path', {
            d: 'M52 292 Q130 252 188 298 Q246 338 338 286',
            stroke: 'rgba(243, 239, 232, 0.03)',
            strokeWidth: 8,
            strokeLinecap: 'round',
            fill: 'none',
          }),
          node('path', {
            d: 'M78 222 Q148 182 206 224 Q256 256 334 216',
            stroke: 'rgba(196, 165, 116, 0.035)',
            strokeWidth: 6,
            strokeLinecap: 'round',
            fill: 'none',
          }),
          ...CITY_LIGHTS.map(([cx, cy, r], index) =>
            createElement('circle', {
              key: `light-${index}`,
              cx,
              cy,
              r,
              fill: 'rgba(232, 201, 155, 0.28)',
            }),
          ),
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
});
