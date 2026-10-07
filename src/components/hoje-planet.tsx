import { createElement, type ReactNode } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';

function node(type: string, props: Record<string, unknown> | null, ...children: ReactNode[]) {
  return createElement(type, props, ...children);
}

/** Tiny urban lights — nearly invisible champagne points on the dark limb. */
const CITY_LIGHTS: [number, number, number][] = [
  [118, 168, 0.9],
  [146, 152, 0.7],
  [172, 178, 0.85],
  [198, 148, 0.65],
  [224, 166, 0.8],
  [248, 184, 0.7],
  [268, 154, 0.75],
  [292, 172, 0.6],
  [312, 196, 0.7],
  [132, 204, 0.55],
  [164, 214, 0.5],
  [206, 198, 0.6],
  [236, 220, 0.45],
  [276, 208, 0.55],
  [184, 236, 0.4],
  [220, 248, 0.35],
  [258, 238, 0.4],
  [154, 186, 0.5],
  [288, 228, 0.35],
  [306, 160, 0.45],
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
            { id: 'hoje-body', cx: '62%', cy: '38%', r: '62%' },
            node('stop', { offset: '0%', stopColor: '#1C1814', stopOpacity: '0.92' }),
            node('stop', { offset: '34%', stopColor: '#100E0C', stopOpacity: '0.88' }),
            node('stop', { offset: '68%', stopColor: '#070606', stopOpacity: '0.94' }),
            node('stop', { offset: '100%', stopColor: '#000000', stopOpacity: '1' }),
          ),
          node(
            'radialGradient',
            { id: 'hoje-limb', cx: '48%', cy: '28%', r: '58%' },
            node('stop', { offset: '0%', stopColor: '#2A241C', stopOpacity: '0.35' }),
            node('stop', { offset: '42%', stopColor: '#161310', stopOpacity: '0.12' }),
            node('stop', { offset: '100%', stopColor: '#000000', stopOpacity: '0' }),
          ),
          node(
            'radialGradient',
            { id: 'hoje-sun', cx: '50%', cy: '58%', r: '50%' },
            node('stop', { offset: '0%', stopColor: '#F8F3EA', stopOpacity: '0.55' }),
            node('stop', { offset: '12%', stopColor: '#E8C99B', stopOpacity: '0.22' }),
            node('stop', { offset: '32%', stopColor: '#E8C99B', stopOpacity: '0.07' }),
            node('stop', { offset: '58%', stopColor: '#C4A574', stopOpacity: '0.025' }),
            node('stop', { offset: '100%', stopColor: '#E8C99B', stopOpacity: '0' }),
          ),
          node(
            'radialGradient',
            { id: 'hoje-glow', cx: '72%', cy: '18%', r: '48%' },
            node('stop', { offset: '0%', stopColor: '#E8C99B', stopOpacity: '0.14' }),
            node('stop', { offset: '28%', stopColor: '#C4A574', stopOpacity: '0.05' }),
            node('stop', { offset: '100%', stopColor: '#000000', stopOpacity: '0' }),
          ),
          node(
            'linearGradient',
            { id: 'hoje-rim', x1: '0', y1: '0', x2: '1', y2: '0' },
            node('stop', { offset: '0%', stopColor: '#E8C99B', stopOpacity: '0' }),
            node('stop', { offset: '18%', stopColor: '#C4A574', stopOpacity: '0.04' }),
            node('stop', { offset: '42%', stopColor: '#E8C99B', stopOpacity: '0.16' }),
            node('stop', { offset: '58%', stopColor: '#F7F1E6', stopOpacity: '0.28' }),
            node('stop', { offset: '74%', stopColor: '#E8C99B', stopOpacity: '0.14' }),
            node('stop', { offset: '100%', stopColor: '#E8C99B', stopOpacity: '0' }),
          ),
          node(
            'linearGradient',
            { id: 'hoje-fade', x1: '0', y1: '0', x2: '0', y2: '1' },
            node('stop', { offset: '0%', stopColor: '#FFFFFF', stopOpacity: '1' }),
            node('stop', { offset: '42%', stopColor: '#FFFFFF', stopOpacity: '0.85' }),
            node('stop', { offset: '68%', stopColor: '#FFFFFF', stopOpacity: '0.35' }),
            node('stop', { offset: '88%', stopColor: '#FFFFFF', stopOpacity: '0.08' }),
            node('stop', { offset: '100%', stopColor: '#FFFFFF', stopOpacity: '0' }),
          ),
          node('mask', { id: 'hoje-fade-mask' }, node('rect', { width: '390', height: '420', fill: 'url(#hoje-fade)' })),
          node(
            'filter',
            { id: 'hoje-soft', x: '-40%', y: '-40%', width: '180%', height: '180%' },
            node('feGaussianBlur', { stdDeviation: '2.2' }),
          ),
          node(
            'filter',
            { id: 'hoje-haze', x: '-20%', y: '-20%', width: '140%', height: '140%' },
            node('feGaussianBlur', { stdDeviation: '8' }),
          ),
        ),
        node(
          'g',
          { mask: 'url(#hoje-fade-mask)' },
          node('ellipse', {
            cx: 278,
            cy: 64,
            rx: 120,
            ry: 54,
            fill: 'url(#hoje-glow)',
            filter: 'url(#hoje-haze)',
          }),
          node('ellipse', {
            cx: 302,
            cy: 78,
            rx: 56,
            ry: 16,
            fill: 'url(#hoje-sun)',
            filter: 'url(#hoje-soft)',
          }),
          node('circle', { cx: 195, cy: 318, r: 248, fill: 'url(#hoje-body)' }),
          node('circle', { cx: 195, cy: 318, r: 248, fill: 'url(#hoje-limb)' }),
          node('circle', {
            cx: 195,
            cy: 318,
            r: 247,
            stroke: 'url(#hoje-rim)',
            strokeWidth: 1.1,
          }),
          node('path', {
            d: 'M48 248 Q118 198 168 236 Q208 268 252 232 Q300 192 348 248',
            stroke: 'rgba(232, 201, 155, 0.035)',
            strokeWidth: 10,
            strokeLinecap: 'round',
            fill: 'none',
            opacity: 0.7,
          }),
          node('path', {
            d: 'M72 278 Q142 242 198 286 Q248 322 328 276',
            stroke: 'rgba(243, 239, 232, 0.028)',
            strokeWidth: 7,
            strokeLinecap: 'round',
            fill: 'none',
          }),
          node('path', {
            d: 'M96 210 Q156 176 210 214 Q250 242 318 208',
            stroke: 'rgba(196, 165, 116, 0.03)',
            strokeWidth: 5,
            strokeLinecap: 'round',
            fill: 'none',
          }),
          ...CITY_LIGHTS.map(([cx, cy, r], index) =>
            createElement('circle', {
              key: `light-${index}`,
              cx,
              cy,
              r,
              fill: 'rgba(232, 201, 155, 0.22)',
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
